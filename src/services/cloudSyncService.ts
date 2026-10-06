import Dexie from 'dexie';
import { db } from '@/db/database';
import type { SyncItem } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const MAX_RETRIES = 5;
const SYNC_ENTITIES = [
  'profiles', 'farms', 'fields', 'cropCycles', 'inventoryBatches', 'salesRecords', 'scans', 'chatMessages', 'fieldBoundaries', 'farmActivities',
  'fertilizerRecords', 'pesticideRecords', 'observations', 'productionRecords'
] as const;
type SyncEntity = typeof SYNC_ENTITIES[number];

function createCloudId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('This browser cannot create secure cloud record identifiers.');
  }
  return globalThis.crypto.randomUUID();
}

function isSyncEntity(entity: string): entity is SyncEntity {
  return SYNC_ENTITIES.includes(entity as SyncEntity);
}

async function isAutoSyncEnabled(userId: number): Promise<boolean> {
  const settings = await db.settings.where('userId').equals(userId).first();
  return settings?.autoSync ?? true;
}

function cloudPayload(payload: Record<string, unknown>) {
  const safePayload = { ...payload };
  delete safePayload.id;
  delete safePayload.localId;
  delete safePayload.cloudId;
  for (const key of Object.keys(RELATIONS)) delete safePayload[key];
  delete safePayload.userId;
  delete safePayload.password;
  delete safePayload.imageData;
  delete safePayload.thumbnailData;
  return safePayload;
}

function reportCloudError(operation: string, error: unknown) {
  if (!import.meta.env.DEV || !error || typeof error !== 'object') return;
  const value = error as { code?: string; message?: string; details?: string; hint?: string };
  console.error(`[Marudham 360] Supabase ${operation} failed`, {
    code: value.code,
    message: value.message,
    details: value.details,
    hint: value.hint,
  });
}

const RELATIONS: Record<string, string> = {
  farmId: 'farms', fieldId: 'fields', cropCycleId: 'cropCycles', inventoryBatchId: 'inventoryBatches',
};

/** Adds or recovers a stable UUID before an operation enters or leaves the queue. */
async function ensureCloudIdentity(
  userId: number,
  entity: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!isSyncEntity(entity)) throw new Error(`Unsupported cloud sync entity: ${entity}`);

  const payload = { ...input };
  const localId = Number(payload.id);
  const table = db.table(entity);
  const existing = Number.isSafeInteger(localId) && localId > 0
    ? await table.get(localId) as Record<string, unknown> | undefined
    : undefined;

  if (existing && existing.userId !== userId) throw new Error('Record belongs to another account.');
  let cloudId = typeof payload.cloudId === 'string' ? payload.cloudId : undefined;
  if (!cloudId && typeof existing?.cloudId === 'string') cloudId = existing.cloudId;
  if (!cloudId) cloudId = createCloudId();
  payload.cloudId = cloudId;

  if (existing && Number.isSafeInteger(localId)) {
    const updates: Record<string, unknown> = {};
    if (existing.cloudId !== cloudId) updates.cloudId = cloudId;
    for (const [key, parentTable] of Object.entries(RELATIONS)) {
      const parentId = existing[key];
      if (typeof parentId !== 'number') continue;
      const parent = await db.table(parentTable).get(parentId);
      if (!parent || parent.userId !== userId) throw new Error('Related record is unavailable for this account.');
      const parentCloudId = parent.cloudId || createCloudId();
      if (!parent.cloudId) {
        await db.table(parentTable).update(parentId, { cloudId: parentCloudId });
        // A newly identified parent must reach the cloud before its child.
        await queueCloudChange(userId, parentTable, 'update', { ...parent, cloudId: parentCloudId }, { deferSync: true });
      }
      const cloudKey = key.replace(/Id$/, 'CloudId');
      payload[cloudKey] = parentCloudId;
      updates[cloudKey] = parentCloudId;
    }
    if (Object.keys(updates).length) await table.update(localId, updates);
  }

  return payload;
}

async function getAuthenticatedCloudUser(userId: number) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  const user = data.session?.user;
  if (error || !user) throw error || new Error('Sign in to Supabase before syncing.');
  const localUser = await db.users.get(userId);
  if (!localUser || localUser.isDemo || localUser.cloudId !== user.id) throw new Error('Sync account does not match the signed-in account.');
  return { client, user };
}

async function uploadItem(item: SyncItem) {
  if (!item.userId) throw new Error(`Sync item ${item.id} is missing its local user ID.`);
  const { client, user } = await getAuthenticatedCloudUser(item.userId);
  const parsed = JSON.parse(item.payload) as Record<string, unknown>;
  const payload = await ensureCloudIdentity(item.userId, item.entity, parsed);
  const cloudId = String(payload.cloudId || '');
  if (!cloudId) throw new Error(`Sync item ${item.id} is missing its cloud record ID.`);

  if (item.id && JSON.stringify(payload) !== item.payload) {
    await db.syncQueue.update(item.id, { payload: JSON.stringify(payload) });
  }

  if (item.operation === 'delete') {
    const { error } = await client
      .from('cloud_records')
      .delete()
      .eq('user_id', user.id)
      .eq('entity', item.entity)
      .eq('cloud_id', cloudId);
    if (error) throw error;
    return;
  }

  const { error } = await client.from('cloud_records').upsert({
    user_id: user.id,
    entity: item.entity,
    cloud_id: cloudId,
    local_id: String(payload.id ?? cloudId),
    payload: cloudPayload(payload),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,entity,cloud_id' });
  if (error) throw error;
}

export async function queueCloudChange(
  userId: number,
  entity: string,
  operation: SyncItem['operation'],
  input: Record<string, unknown>,
  options: { deferSync?: boolean } = {},
) {
  const localUser = await db.users.get(userId);
  if (!localUser) throw new Error('Local account unavailable.');
  if (localUser.isDemo) return 0;
  const payload = await ensureCloudIdentity(userId, entity, input);
  const queueId = await db.syncQueue.add({
    userId,
    entity,
    operation,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  });
  const scheduleSync = () => {
    if (!isSupabaseConfigured()) return;
    void isAutoSyncEnabled(userId).then(enabled => enabled ? processPendingCloudChanges(userId) : undefined)
      .catch(error => reportCloudError('background sync', error));
  };
  if (options.deferSync && Dexie.currentTransaction) Dexie.currentTransaction.on('complete', scheduleSync);
  else if (!options.deferSync) scheduleSync();
  return queueId;
}

const runningSync = new Map<number, Promise<void>>();
export function processPendingCloudChanges(userId: number, options: { force?: boolean } = {}) {
  const running = runningSync.get(userId);
  if (running) return running;
  const task = processQueue(userId, options).finally(() => runningSync.delete(userId));
  runningSync.set(userId, task);
  return task;
}

async function processQueue(userId: number, options: { force?: boolean } = {}) {
  if (!isSupabaseConfigured()) return;
  if (!options.force && !await isAutoSyncEnabled(userId)) return;

  const items = await db.syncQueue
    .where('userId').equals(userId)
    .filter(item => item.status === 'pending' || item.status === 'failed')
    .sortBy('createdAt');

  for (const item of items) {
    if (!item.id) continue;
    if (item.retryCount >= MAX_RETRIES) throw new Error('Sync needs a manual retry.');
    try {
      await uploadItem(item);
      await db.syncQueue.update(item.id, { status: 'synced' });
      if (item.entity === 'scans') {
        const payload = JSON.parse(item.payload) as { id?: number };
        if (payload.id) await db.scans.update(payload.id, { syncStatus: 'synced' });
      }
    } catch (error) {
      reportCloudError(`${item.operation} ${item.entity}`, error);
      await db.syncQueue.update(item.id, {
        status: 'failed',
        retryCount: item.retryCount + 1,
      });
      const failure = new Error('Cloud sync failed. Changes remain saved locally; retry from Settings.') as Error & { cause: unknown };
      failure.cause = error;
      throw failure;
    }
  }
}

export async function hydrateCloudData(userId: number, options: { force?: boolean } = {}) {
  if (!isSupabaseConfigured()) return;
  if (!options.force && !await isAutoSyncEnabled(userId)) return;

  const { client, user } = await getAuthenticatedCloudUser(userId);
  const { data, error } = await client
    .from('cloud_records')
    .select('entity, local_id, cloud_id, payload')
    .eq('user_id', user.id)
    .in('entity', [...SYNC_ENTITIES]);
  if (error) throw error;

  const order = new Map(SYNC_ENTITIES.map((entity, index) => [entity, index]));
  const rows = [...(data || [])].sort((a, b) =>
    (order.get(a.entity as SyncEntity) ?? 99) - (order.get(b.entity as SyncEntity) ?? 99));

  for (const row of rows) {
    if (!isSyncEntity(row.entity) || typeof row.cloud_id !== 'string') continue;
    const table = db.table(row.entity);
    const remotePayload = { ...(row.payload as Record<string, unknown>) };
    delete remotePayload.id;
    delete remotePayload.localId;
    delete remotePayload.cloudId;
    delete remotePayload.userId;
    for (const key of Object.keys(RELATIONS)) delete remotePayload[key];

    if (row.entity === 'scans' && typeof remotePayload.confidence === 'number' && remotePayload.confidence > 1) {
      remotePayload.confidence = Math.min(remotePayload.confidence / 100, 1);
    }

    const existing = await table.where('cloudId').equals(row.cloud_id).filter(record => record.userId === userId).first() as Record<string, unknown> | undefined;

    for (const [key, parentTable] of Object.entries(RELATIONS)) {
      const cloudKey = key.replace(/Id$/, 'CloudId');
      if (typeof remotePayload[cloudKey] !== 'string') continue;
      const parent = await db.table(parentTable).where('cloudId').equals(remotePayload[cloudKey] as string).filter(record => record.userId === userId).first();
      if (!parent?.id) throw new Error('A related cloud record is missing. Retry sync after its parent is uploaded.');
      remotePayload[key] = parent.id;
    }
    const pending = await db.syncQueue.where('userId').equals(userId).filter(item =>
      item.entity === row.entity && item.status !== 'synced' && JSON.parse(item.payload).cloudId === row.cloud_id).count();
    if (pending) continue;

    const value = { ...remotePayload, cloudId: row.cloud_id, userId };
    if (typeof existing?.id === 'number') await table.update(existing.id, value);
    else await table.add(value);
  }
}
