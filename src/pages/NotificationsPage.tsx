import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { db } from '@/db/database';
import { cn } from '@/utils';
import { useAuthStore } from '@/stores/authStore';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        if (!user?.id) {
          setNotifications([]);
          return;
        }
        const notifs = await db.notifications.where('userId').equals(user.id).toArray();
        notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotifications(notifs);
      } catch (error) {
        console.error('Failed to load notifications', error);
      }
    }
    loadNotifications();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-neutral-100 font-sans pb-20">
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-neutral-100 rounded-full text-neutral-600">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="font-bold text-lg text-neutral-900">Notifications</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
          {notifications.map((notif) => (
            <div key={notif.id} className={cn("p-4 flex gap-4 transition-colors", !notif.isRead ? "bg-green-50/30" : "bg-white")}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-1 bg-neutral-100 text-neutral-600">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate text-neutral-900">{notif.title}</h3>
                <p className="text-sm text-neutral-500">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
