import 'fake-indexeddb/auto';
import { SentinelService, NDVI_EXPRESSION, HARMONIZED_NDVI_EXPRESSION, ndviExpression, satelliteGeometry, saveSatelliteBoundary, saveSatelliteSearch, ownedSatelliteField } from '../src/services/sentinelService';
import { matchVoiceCommand } from '../src/data/voiceCommands';
import { encryptDocument, decryptDocument } from '../src/utils/documentCrypto';
import { saveModuleDraft } from '../src/services/moduleDraftService';
import { createField } from '../src/services/fieldService';
import { validateDocumentUpload } from '../src/utils/documentUpload';
import { getSpeechLocale } from '../src/utils/voice';
import Dexie from 'dexie';
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, CropSenseDatabase } from '../src/db/database';
import { saveHarvest, recordHarvestSale, startCropCycle } from '../src/services/harvestService';
import { parseFieldBoundary } from '../src/utils/fieldBoundary';
import { cloudMock } from './supabaseMock';
import { queueCloudChange, processPendingCloudChanges, hydrateCloudData } from '../src/services/cloudSyncService';

beforeEach(async () => {
  Object.assign(cloudMock, { configured: false, sessionId: 'cloud-user-1', rows: [], uploaded: [], fail: false });
  await db.delete(); await db.open();
  await db.users.bulkAdd([{ id: 1, name: 'Test', email: 'test@example.invalid', isDemo: false }, { id: 2, name: 'Other', email: 'other@example.invalid' }] as any);
  await db.fields.add({ id: 1, userId: 1, name: 'Test field', crop: 'paddy' } as any);
  await db.cropCycles.add({ id: 1, userId: 1, fieldId: 1, crop: 'paddy', variety: 'Test', status: 'active' } as any);
});
after(async () => { await db.delete(); });

test('version 9 upgrade preserves records and creates harvest stores', async () => {
  await db.delete();
  const old = new Dexie('CropSenseDB');
  old.version(9).stores({ users: '++id, &email, cloudId, contractId, name, phone', fields: '++id, userId, cloudId, name, crop, status', cropCycles: '++id, userId, fieldId, crop, status' });
  await old.table('fields').add({ id: 42, userId: 1, name: 'Retained field' }); old.close();
  const upgraded = new CropSenseDatabase(); await upgraded.open();
  assert.equal((await upgraded.fields.get(42))?.name, 'Retained field');
  assert.equal(await upgraded.inventoryBatches.count(), 0);
  assert.equal(await upgraded.salesRecords.count(), 0);
  assert.equal(upgraded.verno, 12); upgraded.close();
});

test('concurrent harvest and sale submissions are idempotent and survive reopen', async () => {
  const [a, b] = await Promise.all([saveHarvest(1, 1, 5, 'Ungraded'), saveHarvest(1, 1, 5, 'Ungraded')]);
  assert.equal(a.id, b.id); assert.equal(await db.inventoryBatches.count(), 1);
  const [first, second] = await Promise.all([recordHarvestSale(1, a.id!, 2000), recordHarvestSale(1, a.id!, 2000)]);
  assert.equal(first.id, second.id); assert.equal(first.totalRevenue, 10000);
  assert.equal(await db.salesRecords.count(), 1);
  assert.equal((await db.cropCycles.get(1))?.status, 'completed');
  db.close(); await db.open();
  assert.equal((await db.inventoryBatches.get(a.id!))?.status, 'sold');
  assert.equal(await db.salesRecords.count(), 1);
});

test('rejects cross-account access and invalid quantities without mutations', async () => {
  await assert.rejects(saveHarvest(2, 1, 5, 'A'), /unavailable/);
  for (const value of [0, -1, NaN, Infinity]) await assert.rejects(saveHarvest(1, 1, value, 'A'), /positive/);
  assert.equal(await db.inventoryBatches.count(), 0);
  const batch = await saveHarvest(1, 1, 5, 'A');
  await assert.rejects(recordHarvestSale(2, batch.id!, 20), /unavailable/);
  await assert.rejects(recordHarvestSale(1, batch.id!, -20), /positive/);
  assert.equal(await db.salesRecords.count(), 0);
});

test('outbox failure rolls back inventory mutation', async () => {
  const fail = () => { throw new Error('Test outbox failure'); };
  db.syncQueue.hook('creating', fail);
  try { await assert.rejects(saveHarvest(1, 1, 5, 'A'), /outbox failure/); }
  finally { db.syncQueue.hook('creating').unsubscribe(fail); }
  assert.equal(await db.inventoryBatches.count(), 0);
});

test('crop-cycle and harvest outbox retains stable relationship identifiers', async () => {
  const batch = await saveHarvest(1, 1, 5, 'B');
  const entry = await db.syncQueue.where('entity').equals('inventoryBatches').first();
  const payload = JSON.parse(entry!.payload);
  assert.ok(payload.fieldCloudId); assert.ok(payload.cropCycleCloudId); assert.ok(payload.cloudId);
  assert.equal(payload.id, batch.id);
  await assert.rejects(queueCloudChange(2, 'inventoryBatches', 'update', { ...batch }), /another account/);
});

test('starting another active crop cycle is rejected', async () => {
  await assert.rejects(startCropCycle(1, { fieldId: 1, crop: 'wheat', variety: 'Test', startDate: '2026-10-05', expectedEndDate: '2027-02-05', currentStage: 'germination', status: 'active' }), /already has an active/);
  assert.equal(await db.cropCycles.count(), 1);
});


test('sale outbox failure rolls back revenue, inventory status and cycle completion', async () => {
  const batch = await saveHarvest(1, 1, 5, 'A');
  const fail = () => { throw new Error('Test outbox failure'); };
  db.syncQueue.hook('creating', fail);
  try { await assert.rejects(recordHarvestSale(1, batch.id!, 2000), /outbox failure/); }
  finally { db.syncQueue.hook('creating').unsubscribe(fail); }
  assert.equal(await db.salesRecords.count(), 0);
  assert.equal((await db.inventoryBatches.get(batch.id!))?.status, 'stored');
  assert.equal((await db.cropCycles.get(1))?.status, 'active');
});

test('successful crop planning updates field dates and queues both records atomically', async () => {
  await db.cropCycles.update(1, { status: 'completed' });
  const id = await startCropCycle(1, { fieldId: 1, crop: 'wheat', variety: 'Test', startDate: '2026-10-05', expectedEndDate: '2027-02-05', currentStage: 'germination', status: 'active' });
  assert.equal((await db.cropCycles.get(id))?.userId, 1);
  assert.equal((await db.fields.get(1))?.plantingDate, '2026-10-05');
  assert.equal((await db.fields.get(1))?.growthStage, 'germination');
  assert.equal(await db.syncQueue.count(), 2);
});

test('GeoJSON converts longitude/latitude and rejects invalid boundaries', () => {
  const polygon = { type: 'Polygon', coordinates: [[[80, 13], [81, 13], [81, 14], [80, 13]]] };
  assert.deepEqual(parseFieldBoundary(JSON.stringify(polygon))[0], [13, 80]);
  assert.deepEqual(parseFieldBoundary(JSON.stringify({ type: 'Feature', geometry: polygon }))[1], [13, 81]);
  assert.deepEqual(parseFieldBoundary('[[13,80],[13,81],[14,81]]')[0], [13, 80]);
  for (const value of ['{}', '[[91,80],[13,81],[14,81]]', '[[13,80],[13,80],[13,80]]']) assert.throws(() => parseFieldBoundary(value));
});

test('cloud account mismatch never uploads the local account records', async () => {
  await saveHarvest(1, 1, 5, 'A');
  cloudMock.configured = true;
  await db.users.update(1, { cloudId: 'different-cloud-account' });
  await assert.rejects(processPendingCloudChanges(1, { force: true }), /Cloud sync failed/);
  assert.equal(cloudMock.uploaded.length, 0);
  assert.equal((await db.syncQueue.toArray())[0].status, 'failed');
  await assert.rejects(hydrateCloudData(1, { force: true }), /does not match/);
});

test('concurrent sync calls upload once and omit device-local relationship IDs', async () => {
  await saveHarvest(1, 1, 5, 'A');
  await db.users.update(1, { cloudId: 'cloud-user-1' });
  cloudMock.configured = true;
  await Promise.all([processPendingCloudChanges(1, { force: true }), processPendingCloudChanges(1, { force: true })]);
  assert.equal(cloudMock.uploaded.length, 3);
  assert.deepEqual(cloudMock.uploaded.map(row => row.entity), ['fields', 'cropCycles', 'inventoryBatches']);
  const payload = cloudMock.uploaded[2].payload;
  assert.ok(payload.fieldCloudId); assert.ok(payload.cropCycleCloudId);
  assert.equal(payload.fieldId, undefined); assert.equal(payload.cropCycleId, undefined); assert.equal(payload.userId, undefined);
});

test('hydration restores parent relations with new local IDs without overwriting queued work', async () => {
  await db.users.update(1, { cloudId: 'cloud-user-1' });
  cloudMock.configured = true;
  cloudMock.rows = [
    { entity: 'inventoryBatches', cloud_id: 'batch-remote', local_id: '1', payload: { fieldCloudId: 'field-remote', cropCycleCloudId: 'cycle-remote', quantity: 4, status: 'stored' } },
    { entity: 'cropCycles', cloud_id: 'cycle-remote', local_id: '1', payload: { fieldCloudId: 'field-remote', crop: 'wheat', status: 'active' } },
    { entity: 'fields', cloud_id: 'field-remote', local_id: '1', payload: { name: 'Remote field' } },
  ];
  await hydrateCloudData(1, { force: true });
  const field = await db.fields.where('cloudId').equals('field-remote').first();
  const cycle = await db.cropCycles.where('cloudId').equals('cycle-remote').first();
  const batch = await db.inventoryBatches.where('cloudId').equals('batch-remote').first();
  assert.notEqual(field!.id, 1);
  assert.equal((await db.fields.get(1))?.name, 'Test field');
  assert.equal(cycle!.fieldId, field!.id); assert.equal(batch!.cropCycleId, cycle!.id);
  await db.fields.update(field!.id!, { name: 'Pending local edit' });
  cloudMock.configured = false;
  await queueCloudChange(1, 'fields', 'update', { ...field, name: 'Pending local edit' });
  cloudMock.configured = true;
  await hydrateCloudData(1, { force: true });
  assert.equal((await db.fields.get(field!.id!))?.name, 'Pending local edit');
});


test('speech language mapping preserves supplied locales and includes regional languages', () => {
  assert.equal(getSpeechLocale('ta'), 'ta-IN');
  assert.equal(getSpeechLocale('pa'), 'pa-IN');
  assert.equal(getSpeechLocale('od'), 'or-IN');
  assert.equal(getSpeechLocale('en-US'), 'en-US');
  assert.equal(getSpeechLocale('invalid'), 'en-IN');
});

const newField = { userId: 1, name: ' New field ', area: 2.5, areaUnit: 'acres', crop: 'paddy', variety: ' Test ', location: ' Village ', plantingDate: '2026-10-06', expectedHarvest: '2027-02-06', growthStage: 'nursery', healthScore: 100, status: 'healthy', diseaseRisk: 'low' } as const;

test('field creation validates inputs and commits its outbox atomically', async () => {
  for (const area of [0, -1, NaN, Infinity]) await assert.rejects(createField({ ...newField, area }), /positive/);
  await assert.rejects(createField({ ...newField, expectedHarvest: '2026-01-01' }), /Harvest date/);
  await assert.rejects(createField({ ...newField, plantingDate: 'invalid' }), /valid planting/);
  await assert.rejects(createField({ ...newField, userId: 99 }), /log in/);
  const fail = () => { throw new Error('Test outbox failure'); };
  db.syncQueue.hook('creating', fail);
  try { await assert.rejects(createField(newField), /outbox failure/); }
  finally { db.syncQueue.hook('creating').unsubscribe(fail); }
  assert.equal(await db.fields.count(), 1);
  const id = await createField(newField);
  assert.equal((await db.fields.get(id))?.name, 'New field');
  assert.equal(await db.syncQueue.count(), 1);
});

test('document uploads reject unsupported, empty, oversized and mismatched files', async () => {
  await assert.rejects(validateDocumentUpload(new Blob(['text'], { type: 'text/plain' })), /Choose/);
  await assert.rejects(validateDocumentUpload(new Blob([], { type: 'image/png' })), /Choose/);
  await assert.rejects(validateDocumentUpload(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' })), /Choose/);
  await assert.rejects(validateDocumentUpload(new Blob(['not a pdf'], { type: 'application/pdf' })), /contents/);
  await validateDocumentUpload(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
  await validateDocumentUpload(new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], { type: 'image/png' }));
});


test('presentation module drafts persist after reopen and remain account scoped', async () => {
  const id = await saveModuleDraft({ userId: 1, kind: 'marketplace', title: ' Harvest help ', detail: ' Five workers for paddy ', neededDate: '2026-11-01' });
  await saveModuleDraft({ userId: 2, kind: 'expert', title: 'Other question', detail: 'Other account detail' });
  db.close(); await db.open();
  assert.equal((await db.moduleDrafts.get(id))?.title, 'Harvest help');
  const own = await db.moduleDrafts.where('userId').equals(1).toArray();
  assert.equal(own.length, 1); assert.equal(own[0].kind, 'marketplace');
  assert.equal(await db.syncQueue.count(), 0);
});

test('module drafts reject missing accounts, empty text and impossible dates', async () => {
  const draft = { userId: 1, kind: 'community' as const, title: 'Question', detail: 'Details' };
  await assert.rejects(saveModuleDraft({ ...draft, userId: 99 }), /Sign in/);
  await assert.rejects(saveModuleDraft({ ...draft, title: ' ' }), /title/);
  await assert.rejects(saveModuleDraft({ ...draft, neededDate: '2026-02-30' }), /valid requested date/);
  await assert.rejects(saveModuleDraft({ ...draft, detail: 'x'.repeat(4001) }), /details/);
  assert.equal(await db.moduleDrafts.count(), 0);
});

test('version 10 upgrade retains harvest and creates local module drafts', async () => {
  await db.delete();
  const old = new Dexie('CropSenseDB');
  old.version(10).stores({ users: '++id, &email', inventoryBatches: '++id, userId, fieldId, cropCycleId, status', salesRecords: '++id, userId, inventoryBatchId, saleDate' });
  await old.table('inventoryBatches').add({ id: 42, userId: 1, quantity: 7 }); old.close();
  const upgraded = new CropSenseDatabase(); await upgraded.open();
  assert.equal((await upgraded.inventoryBatches.get(42))?.quantity, 7);
  assert.equal(await upgraded.moduleDrafts.count(), 0);
  upgraded.close();
});


test('document encryption persists ciphertext and rejects wrong keys or tampering', async () => {
  const data = 'data:application/pdf;base64,JVBERi0xLjc=';
  const passphrase = 'a long prototype passphrase';
  const first = await encryptDocument(data, passphrase);
  const second = await encryptDocument(data, passphrase);
  assert.notDeepEqual(first.iv, second.iv); assert.notDeepEqual(first.salt, second.salt);
  const id = await db.documents.add({ userId: 1, name: 'test.pdf', type: 'Other', size: 8, date: new Date().toISOString(), encryptedData: first });
  db.close(); await db.open();
  const stored = await db.documents.get(id);
  assert.equal(stored?.dataUrl, undefined);
  assert.equal(await decryptDocument(stored!.encryptedData!, passphrase), data);
  await assert.rejects(decryptDocument(first, 'wrong passphrase'), /Unable to unlock/);
  const damaged = { ...first, ciphertext: first.ciphertext.slice(0) };
  new Uint8Array(damaged.ciphertext)[0] ^= 1;
  await assert.rejects(decryptDocument(damaged, passphrase), /Unable to unlock/);
  await assert.rejects(encryptDocument(data, 'short'), /at least 12/);
});


test('fixed Tamil and English voice phrases navigate to the same presentation modules', () => {
  assert.equal(matchVoiceCommand('பண்ணை நினைவகம் திற')?.path, '/farm-memory');
  assert.equal(matchVoiceCommand('Open farm memory!')?.path, '/farm-memory');
  assert.equal(matchVoiceCommand('ஆவண பெட்டகம் திற')?.path, '/documents');
  assert.equal(matchVoiceCommand('unrecognized command'), undefined);
});


const satellitePolygon = { type: 'Polygon', coordinates: [[[80.27,13.082],[80.2715,13.082],[80.2715,13.0835],[80.27,13.082]]] };

test('satellite boundary saves atomically, rejects other accounts and invalidates cached observations', async () => {
  const boundary = await saveSatelliteBoundary(1,1,JSON.stringify(satellitePolygon));
  const saved = { userId:1, fieldId:1, boundary, scenes:[], fetchedAt:'2026-10-06', startDate:'2026-09-01', endDate:'2026-10-06', maxCloudCover:40 };
  await saveSatelliteSearch(saved);
  assert.equal(await db.satelliteSearches.count(),1);
  await assert.rejects(ownedSatelliteField(2,1), /unavailable/);
  await assert.rejects(saveSatelliteSearch({ ...saved, userId:2 }), /unavailable/);
  const fail = () => { throw new Error('Test outbox failure'); };
  db.syncQueue.hook('creating',fail);
  try { await assert.rejects(saveSatelliteBoundary(1,1,JSON.stringify(satellitePolygon)),/outbox failure/); }
  finally { db.syncQueue.hook('creating').unsubscribe(fail); }
  assert.equal(await db.satelliteSearches.count(),1);
  await saveSatelliteBoundary(1,1,JSON.stringify(satellitePolygon));
  assert.equal(await db.fieldBoundaries.count(),1);
  assert.equal(await db.satelliteSearches.count(),0);
  await assert.rejects(saveSatelliteSearch({ ...saved, boundary:'changed' }),/boundary changed/);
});

test('Sentinel adapter requests actual geometry and validates tiles and statistics', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url,init = {}) => {
    requests.push({ url:String(url),init });
    if (String(url).includes('/search')) return Response.json({ features:[{ id:'S2A_TEST', properties:{ datetime:'2026-10-03T00:00:00Z', 'eo:cloud_cover':17, 's2:processing_baseline':'03.00' }, assets:{ B04:{},B08:{} } }] });
    if (String(url).includes('tilejson')) return Response.json({ tiles:['https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}?item=S2A_TEST'] });
    return Response.json({ properties:{ statistics:{ [NDVI_EXPRESSION]:{ mean:0.25,min:-0.1,max:0.5,valid_pixels:20,valid_percent:90 } } } });
  }) as typeof fetch;
  try {
    const geometry = satelliteGeometry(JSON.stringify(satellitePolygon));
    const scenes = await SentinelService.search(geometry,'2026-09-01','2026-10-06',40);
    assert.equal(scenes[0].cloudCover,17);
    assert.equal(ndviExpression({ ...scenes[0], processingBaseline:'05.13' }),HARMONIZED_NDVI_EXPRESSION);
    assert.throws(() => ndviExpression({ ...scenes[0], processingBaseline:undefined }),/baseline is unknown/);
    assert.deepEqual(JSON.parse(String(requests[0].init.body)).intersects,geometry);
    assert.match(await SentinelService.tiles(scenes[0]),/\{z\}/);
    assert.equal((await SentinelService.statistics(scenes[0],geometry)).mean,0.25);
    assert.deepEqual(JSON.parse(String(requests[2].init.body)).geometry,geometry);
    globalThis.fetch = (async () => Response.json({ tiles:['https://untrusted.invalid/{z}/{x}/{y}'] })) as typeof fetch;
    await assert.rejects(SentinelService.tiles({ id:'S2A_TEST',date:'2026-10-03',cloudCover:0,processingBaseline:'03.00' }),/unsupported tile source/);
    globalThis.fetch = (async () => new Response('unavailable',{ status:503 })) as typeof fetch;
    await assert.rejects(SentinelService.search(geometry,'2026-09-01','2026-10-06',40),/503/);
    await assert.rejects(SentinelService.search(geometry,'2026-02-30','2026-10-06',40),/ordered search dates/);
    assert.throws(() => satelliteGeometry('[[13,80],[13,80.01],[13,80.02]]'),/no measurable area/);
  } finally { globalThis.fetch = originalFetch; }
});


test('version 11 upgrade retains module drafts and adds satellite cache', async () => {
  await db.delete();
  const old = new Dexie('CropSenseDB');
  old.version(11).stores({ moduleDrafts:'++id, userId, kind, createdAt' });
  await old.table('moduleDrafts').add({ id:42,userId:1,kind:'community',title:'Retained question' }); old.close();
  const upgraded = new CropSenseDatabase(); await upgraded.open();
  assert.equal((await upgraded.moduleDrafts.get(42))?.title,'Retained question');
  assert.equal(await upgraded.satelliteSearches.count(),0); upgraded.close();
});
