import { db } from '@/db/database';
import type { Field } from '@/types';
import { queueCloudChange } from './cloudSyncService';

export async function createField(field: Omit<Field, 'id'>) {
  if (!Number.isFinite(field.area) || field.area <= 0) throw new Error('Area must be a positive number.');
  if (![field.name, field.variety, field.location].every(value => value?.trim())) throw new Error('Name, variety and location are required.');
  const planting = Date.parse(field.plantingDate);
  const harvest = Date.parse(field.expectedHarvest);
  if (!Number.isFinite(planting) || !Number.isFinite(harvest) || harvest < planting) throw new Error('Harvest date must be on or after a valid planting date.');
  const userId = field.userId;
  if (!userId) throw new Error('Please log in before adding a field.');
  return db.transaction('rw', db.tables, async () => {
    if (!await db.users.get(userId)) throw new Error('Please log in before adding a field.');
    const record = { ...field, name: field.name.trim(), variety: field.variety.trim(), location: field.location.trim() };
    const id = await db.fields.add(record);
    await queueCloudChange(userId, 'fields', 'create', { ...record, id }, { deferSync: true });
    return id;
  });
}
