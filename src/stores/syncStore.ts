import { create } from 'zustand';
import { SyncItem } from '@/types';
import { db } from '@/db/database';
import { useAuthStore } from './authStore';
import { hydrateCloudData, processPendingCloudChanges } from '@/services/cloudSyncService';

interface SyncState {
  queue: SyncItem[];
  pendingCount: number;
  loading: boolean;
  loadQueue: () => Promise<void>;
  addToQueue: (item: Omit<SyncItem, 'id' | 'createdAt' | 'retryCount' | 'status'>) => Promise<void>;
  processQueue: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  queue: [],
  pendingCount: 0,
  loading: false,
  loadQueue: async () => {
    set({ loading: true });
    const user = useAuthStore.getState().user;
    if (user && user.id) {
      const queue = await db.syncQueue.where('userId').equals(user.id).toArray();
      const pendingCount = queue.filter(q => q.status === 'pending').length;
      set({ queue, pendingCount, loading: false });
    } else {
      set({ queue: [], pendingCount: 0, loading: false });
    }
  },
  addToQueue: async (item) => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) throw new Error('User not authenticated');
    
    const fullItem: SyncItem = {
      ...item,
      userId: user.id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };
    await db.syncQueue.add(fullItem);
    await get().loadQueue();
  },
  processQueue: async () => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) return;
    
    await hydrateCloudData(user.id, { force: true });
    await processPendingCloudChanges(user.id, { force: true });
    await get().loadQueue();
  },
  retryFailed: async () => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) return;
    
    const queue = await db.syncQueue.where('userId').equals(user.id).and(item => item.status === 'failed').toArray();
    for (const item of queue) {
      if (item.id) {
        await db.syncQueue.update(item.id, { status: 'pending', retryCount: item.retryCount + 1 });
      }
    }
    await get().processQueue();
  }
}));
