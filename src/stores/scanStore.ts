import { create } from 'zustand';
import { Scan } from '@/types';
import { db } from '@/db/database';
import { useAuthStore } from './authStore';
import { queueCloudChange } from '@/services/cloudSyncService';

interface ScanState {
  scans: Scan[];
  loading: boolean;
  loadScans: () => Promise<void>;
  addScan: (scan: Omit<Scan, 'id'>) => Promise<void>;
  getScanById: (id: number) => Scan | undefined;
  getRecentScans: (limit?: number) => Scan[];
  getScansByField: (fieldId: number) => Scan[];
  reset: () => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  scans: [],
  loading: false,
  loadScans: async () => {
    set({ loading: true });
    const user = useAuthStore.getState().user;
    if (user && user.id) {
      const scans = await db.scans.where('userId').equals(user.id).toArray();
      scans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      set({ scans, loading: false });
    } else {
      set({ scans: [], loading: false });
    }
  },
  addScan: async (scan) => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) throw new Error('User not authenticated');
    
    const scanWithUserId = { ...scan, userId: user.id };
    const id = await db.scans.add(scanWithUserId);
    await queueCloudChange(user.id, 'scans', 'create', { ...scanWithUserId, id });
    set((state) => {
      const newScans = [{ ...scanWithUserId, id }, ...state.scans];
      return { scans: newScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
    });
  },
  getScanById: (id) => get().scans.find(s => s.id === id),
  getRecentScans: (limit = 5) => get().scans.slice(0, limit),
  getScansByField: (fieldId) => get().scans.filter(s => s.fieldId === fieldId),
  reset: () => set({ scans: [], loading: false })
}));
