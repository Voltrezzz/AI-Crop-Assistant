import { create } from 'zustand';
import { Field } from '@/types';
import { db } from '@/db/database';
import { useAuthStore } from './authStore';
import { queueCloudChange } from '@/services/cloudSyncService';

interface FieldState {
  fields: Field[];
  loading: boolean;
  loadFields: () => Promise<void>;
  addField: (field: Omit<Field, 'id'>) => Promise<void>;
  updateField: (id: number, field: Partial<Field>) => Promise<void>;
  deleteField: (id: number) => Promise<void>;
  getFieldById: (id: number) => Field | undefined;
  reset: () => void;
}

export const useFieldStore = create<FieldState>((set, get) => ({
  fields: [],
  loading: false,
  loadFields: async () => {
    set({ loading: true });
    const user = useAuthStore.getState().user;
    if (user && user.id) {
      const fields = await db.fields.where('userId').equals(user.id).toArray();
      set({ fields, loading: false });
    } else {
      set({ fields: [], loading: false });
    }
  },
  addField: async (field) => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) throw new Error('User not authenticated');
    
    const fieldWithUserId = { ...field, userId: user.id };
    const id = await db.fields.add(fieldWithUserId);
    await queueCloudChange(user.id, 'fields', 'create', { ...fieldWithUserId, id });
    set((state) => ({ fields: [...state.fields, { ...fieldWithUserId, id }] }));
  },
  updateField: async (id, field) => {
    await db.fields.update(id, field);
    const updated = await db.fields.get(id);
    if (updated?.userId) await queueCloudChange(updated.userId, 'fields', 'update', updated as unknown as Record<string, unknown>);
    set((state) => ({
      fields: state.fields.map(f => f.id === id ? { ...f, ...field } : f)
    }));
  },
  deleteField: async (id) => {
    const field = await db.fields.get(id);
    if (field?.userId) await queueCloudChange(field.userId, 'fields', 'delete', { id });
    await db.fields.delete(id);
    set((state) => ({ fields: state.fields.filter(f => f.id !== id) }));
  },
  getFieldById: (id) => {
    return get().fields.find(f => f.id === id);
  },
  reset: () => set({ fields: [], loading: false })
}));
