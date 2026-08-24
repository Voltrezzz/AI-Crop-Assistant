import { create } from 'zustand';
import { AppNotification } from '@/types';
import { db } from '@/db/database';
import { useAuthStore } from './authStore';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead'>) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loadNotifications: async () => {
    set({ loading: true });
    const user = useAuthStore.getState().user;
    if (user && user.id) {
      const notifications = await db.notifications.where('userId').equals(user.id).toArray();
      notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const unreadCount = notifications.filter(n => !n.isRead).length;
      set({ notifications, unreadCount, loading: false });
    } else {
      set({ notifications: [], unreadCount: 0, loading: false });
    }
  },
  addNotification: async (notif) => {
    const user = useAuthStore.getState().user;
    if (!user || !user.id) throw new Error('User not authenticated');
    
    const fullNotif: AppNotification = { ...notif, userId: user.id, isRead: false };
    await db.notifications.add(fullNotif);
    await get().loadNotifications();
  },
  markRead: async (id) => {
    await db.notifications.update(id, { isRead: true });
    await get().loadNotifications();
  },
  reset: () => set({ notifications: [], unreadCount: 0, loading: false })
}));
