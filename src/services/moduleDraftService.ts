import { db } from '@/db/database';

export type ModuleDraftKind = 'community' | 'expert' | 'marketplace' | 'enterprise';
export interface ModuleDraft { id?: number; userId: number; kind: ModuleDraftKind; title: string; detail: string; neededDate?: string; createdAt: string; }

export async function saveModuleDraft(input: Omit<ModuleDraft, 'id' | 'createdAt'>) {
  if (!['community', 'expert', 'marketplace', 'enterprise'].includes(input.kind)) throw new Error('Unsupported draft type.');
  const title = input.title.trim(), detail = input.detail.trim();
  if (!title || title.length > 120 || !detail || detail.length > 4000) throw new Error('Enter a title (up to 120 characters) and details (up to 4,000 characters).');
  if (input.neededDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.neededDate) || !Number.isFinite(Date.parse(input.neededDate)) || new Date(input.neededDate).toISOString().slice(0, 10) !== input.neededDate)) throw new Error('Enter a valid requested date.');
  return db.transaction('rw', db.users, db.moduleDrafts, async () => {
    if (!await db.users.get(input.userId)) throw new Error('Sign in before saving a draft.');
    return db.moduleDrafts.add({ ...input, title, detail, createdAt: new Date().toISOString() });
  });
}
