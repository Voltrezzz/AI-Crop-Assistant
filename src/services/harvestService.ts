import { db } from '@/db/database';
import { queueCloudChange } from './cloudSyncService';
import type { CropCycle, InventoryBatch } from '@/types';

// The local mutation and its outbox entries commit together, including offline.
export async function saveHarvest(userId: number, cycleId: number, quantity: number, qualityGrade: string) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Enter a positive quantity.');
  if (!['Ungraded', 'A', 'B', 'C'].includes(qualityGrade)) throw new Error('Choose a manual grade.');
  return db.transaction('rw', db.tables, async () => {
    const cycle = await db.cropCycles.get(cycleId);
    const field = cycle && await db.fields.get(cycle.fieldId);
    if (!cycle || cycle.userId !== userId || field?.userId !== userId) throw new Error('Crop cycle unavailable.');
    const existing = await db.inventoryBatches.where('cropCycleId').equals(cycleId).filter(b => b.userId === userId).first();
    if (existing) return existing;
    if (cycle.status !== 'active') throw new Error('This crop cycle is no longer active.');
    const batch: InventoryBatch = { userId, cropCycleId: cycleId, fieldId: cycle.fieldId, crop: cycle.crop,
      variety: cycle.variety, quantity, quantityUnit: 'Quintals', qualityGrade,
      harvestDate: new Date().toISOString(), status: 'stored' };
    batch.id = await db.inventoryBatches.add(batch);
    await queueCloudChange(userId, 'inventoryBatches', 'create', { ...batch }, { deferSync: true });
    return batch;
  });
}

export async function recordHarvestSale(userId: number, batchId: number, pricePerUnit: number) {
  if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) throw new Error('Enter a positive sale price.');
  return db.transaction('rw', db.tables, async () => {
    const batch = await db.inventoryBatches.get(batchId);
    if (!batch || batch.userId !== userId || !batch.cropCycleId) throw new Error('Harvest unavailable.');
    const cycle = await db.cropCycles.get(batch.cropCycleId);
    if (!cycle || cycle.userId !== userId) throw new Error('Crop cycle unavailable.');
    const existing = await db.salesRecords.where('inventoryBatchId').equals(batchId).filter(s => s.userId === userId).first();
    if (existing) return existing;
    if (batch.status !== 'stored') throw new Error('This harvest is no longer available for sale.');
    const totalRevenue = batch.quantity * pricePerUnit;
    if (!Number.isFinite(totalRevenue)) throw new Error('Sale amount is too large.');
    const sale = { userId, inventoryBatchId: batchId, quantitySold: batch.quantity, pricePerUnit,
      totalRevenue, saleDate: new Date().toISOString() };
    const id = await db.salesRecords.add(sale);
    await db.inventoryBatches.update(batchId, { status: 'sold' });
    await db.cropCycles.update(batch.cropCycleId, { status: 'completed' });
    await queueCloudChange(userId, 'salesRecords', 'create', { ...sale, id }, { deferSync: true });
    await queueCloudChange(userId, 'inventoryBatches', 'update', { ...batch, status: 'sold' }, { deferSync: true });
    await queueCloudChange(userId, 'cropCycles', 'update', { ...cycle, status: 'completed' }, { deferSync: true });
    return { ...sale, id };
  });
}

export async function startCropCycle(userId: number, cycle: Omit<CropCycle, 'id'>) {
  return db.transaction('rw', db.tables, async () => {
    const field = await db.fields.get(cycle.fieldId);
    if (!field || field.userId !== userId) throw new Error('Field unavailable.');
    const active = await db.cropCycles.where('fieldId').equals(cycle.fieldId).filter(c => c.userId === userId && c.status === 'active').first();
    if (active) throw new Error('This field already has an active crop cycle. Complete it before starting another.');
    const id = await db.cropCycles.add({ ...cycle, userId });
    const changes = { crop: cycle.crop, plantingDate: cycle.startDate, expectedHarvest: cycle.expectedEndDate, growthStage: cycle.currentStage };
    await db.fields.update(cycle.fieldId, changes);
    await queueCloudChange(userId, 'fields', 'update', { ...field, ...changes }, { deferSync: true });
    await queueCloudChange(userId, 'cropCycles', 'create', { ...cycle, userId, id }, { deferSync: true });
    return id;
  });
}
