import { db } from '@/db/database';
import type { SyncItem } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const MAX_RETRIES = 5;
const SYNC_ENTITIES = ['profiles', 'fields', 'scans', 'chatMessages'] as const;
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
  const {
    id: _id,
    localId: _localId,
    cloudId: _cloudId,
    fieldId: _fieldId,
    userId: _userId,
    password: _password,
    imageData: _imageData,
    thumbnailData: _thumbnailData,
    ...safePayload
  } = payload;
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

async function ensureFieldCloudId(userId: number, fieldId: number): Promise<string | undefined> {
  const field = await db.fields.get(fieldId);
  if (!field || field.userId !== userId) return undefined;
  if (field.cloudId) return field.cloudId;
  const cloudId = createCloudId();
  await db.fields.update(fieldId, { cloudId });
  return cloudId;
}

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

  let cloudId = typeof payload.cloudId === 'string' ? payload.cloudId : undefined;
  if (!cloudId && typeof existing?.cloudId === 'string') cloudId = existing.cloudId;
  if (!cloudId) cloudId = createCloudId();
  payload.cloudId = cloudId;

  if (existing && Number.isSafeInteger(localId)) {
    const updates: Record<string, unknown> = {};
    if (existing.cloudId !== cloudId) updates.cloudId = cloudId;
    if (entity === 'scans' && typeof existing.fieldId === 'number') {
      const fieldCloudId = await ensureFieldCloudId(userId, existing.fieldId);
      if (fieldCloudId) {
        payload.fieldCloudId = fieldCloudId;
        if (existing.fieldCloudId !== fieldCloudId) updates.fieldCloudId = fieldCloudId;
      }
    }
    if (Object.keys(updates).length) await table.update(localId, updates);
  }

  return payload;
}

async function getAuthenticatedCloudUser() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  const user = data.session?.user;
  if (error || !user) throw error || new Error('Sign in to Supabase before syncing.');
  return { client, user };
}

async function uploadItem(item: SyncItem) {
  if (!item.userId) throw new Error(`Sync item ${item.id} is missing its local user ID.`);
  const { client, user } = await getAuthenticatedCloudUser();
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
) {
  const localUser = await db.users.get(userId);
  if (localUser?.isDemo) return 0;
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
  if (isSupabaseConfigured() && await isAutoSyncEnabled(userId)) {
    void processPendingCloudChanges(userId);
  }
  return queueId;
}

export async function processPendingCloudChanges(userId: number, options: { force?: boolean } = {}) {
  if (!isSupabaseConfigured()) return;
  if (!options.force && !await isAutoSyncEnabled(userId)) return;

  const items = await db.syncQueue
    .where('userId').equals(userId)
    .filter(item => item.status === 'pending' || (item.status === 'failed' && item.retryCount < MAX_RETRIES))
    .sortBy('createdAt');

  for (const item of items) {
    if (!item.id) continue;
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
    }
  }
}

export async function hydrateCloudData(userId: number, options: { force?: boolean } = {}) {
  if (!isSupabaseConfigured()) return;
  if (!options.force && !await isAutoSyncEnabled(userId)) return;

  const { client, user } = await getAuthenticatedCloudUser();
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
    delete remotePayload.fieldId;

    if (row.entity === 'scans' && typeof remotePayload.confidence === 'number' && remotePayload.confidence > 1) {
      remotePayload.confidence = Math.min(remotePayload.confidence / 100, 1);
    }

    let existing = await table.where('cloudId').equals(row.cloud_id).first() as Record<string, unknown> | undefined;
    if (existing && existing.userId !== userId) existing = undefined;

    // One-time reconciliation for records uploaded before cloud_id existed.
    if (!existing) {
      const legacyLocalId = Number(row.local_id);
      if (Number.isSafeInteger(legacyLocalId)) {
        const legacyRecord = await table.get(legacyLocalId) as Record<string, unknown> | undefined;
        if (legacyRecord?.userId === userId && !legacyRecord.cloudId) existing = legacyRecord;
      }
    }

    if (row.entity === 'scans' && typeof remotePayload.fieldCloudId === 'string') {
      const localField = await db.fields.where('cloudId').equals(remotePayload.fieldCloudId).first();
      if (localField?.id && localField.userId === userId) remotePayload.fieldId = localField.id;
    }

    const value = { ...remotePayload, cloudId: row.cloud_id, userId };
    if (typeof existing?.id === 'number') await table.update(existing.id, value);
    else await table.add(value);
  }
}
