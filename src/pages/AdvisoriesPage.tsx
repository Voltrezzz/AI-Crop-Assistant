import React, { useState, useEffect } from 'react';
import { db } from '@/db/database';
import { Advisory } from '@/types';
import { Bell, CloudRain, Bug, Leaf, Shield, Check, Calendar, Filter } from 'lucide-react';
import { cn, formatDate, getSeverityColor } from '@/utils';
import { useAuthStore } from '@/stores/authStore';
import PrototypeNotice from '@/components/PrototypeNotice';

export default function AdvisoriesPage() {
  const { user } = useAuthStore();
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCrop, setFilterCrop] = useState<string>('all');

  const [demoAdvisories] = useState<Advisory[]>(() => [
    {
      id: -1,
      title: 'Inspect paddy leaves after recent rainfall',
      message: 'Prolonged leaf wetness can trigger blast disease. Inspect lower canopy leaves for diamond-shaped lesions.',
      type: 'weather',
      severity: 'moderate',
      date: new Date().toISOString(),
      crop: 'paddy',
      isRead: false
    },
    {
      id: -2,
      title: 'Monitor wheat leaves for rust symptoms',
      message: 'Humid conditions are favorable for stem and leaf rust. Check for orange/brown pustules on stems and leaves.',
      type: 'disease',
      severity: 'moderate',
      date: new Date(Date.now() - 86400000).toISOString(),
      crop: 'wheat',
      isRead: false
    },
    {
      id: -3,
      title: 'Paddy approaching flowering stage',
      message: 'Ensure adequate water level (2-3 inches) in the field during the flowering stage to prevent sterility.',
      type: 'growth',
      severity: 'low',
      date: new Date(Date.now() - 172800000).toISOString(),
      crop: 'paddy',
      isRead: true
    },
    {
      id: -4,
      title: 'Apply preventive fungicide before monsoon',
      message: 'Heavy rains expected next week. Consider applying a preventive broad-spectrum fungicide to protect standing crops.',
      type: 'preventive',
      severity: 'high',
      date: new Date(Date.now() - 259200000).toISOString(),
      isRead: true
    }
  ]);

  useEffect(() => {
    const loadAdvisories = async () => {
      if (!user?.id) {
        setAdvisories([]);
        return;
      }
      const data = await db.advisories.where('userId').equals(user.id).toArray();
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (data && data.length > 0) {
        setAdvisories(data);
      } else {
        setAdvisories(user.isDemo ? demoAdvisories.map(a => ({ ...a, userId: user.id })) : []);
      }
    };
    loadAdvisories();
  }, [user, demoAdvisories]);

  const markAsRead = async (id: number) => {
    try {
      const advisory = await db.advisories.get(id);
      if (advisory?.userId === user?.id) {
        await db.advisories.update(id, { isRead: true });
      }
      setAdvisories(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch {
      // If it's a demo advisory not in db
      setAdvisories(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    }
  };

  const markAllRead = async () => {
    const unread = advisories.filter(a => !a.isRead);
    for (const a of unread) {
      if (a.id && a.id > 0 && a.userId === user?.id) {
        await db.advisories.update(a.id, { isRead: true });
      }
    }
    setAdvisories(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'weather': return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'disease': return <Bug className="w-5 h-5 text-red-500" />;
      case 'growth': return <Leaf className="w-5 h-5 text-green-500" />;
      case 'preventive': return <Shield className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const filtered = advisories.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterCrop !== 'all' && a.crop && a.crop !== filterCrop) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {user?.isDemo && <PrototypeNotice>Demo-account advisories are sample guidance, not live alerts.</PrototypeNotice>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Agricultural Advisories</h1>
        <button
          onClick={markAllRead}
          className="text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 px-4 py-2 rounded-lg transition-colors"
        >
          Mark all as read
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border-gray-200 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
        >
          <option value="all">All Types</option>
          <option value="weather">Weather</option>
          <option value="disease">Disease</option>
          <option value="growth">Growth Stage</option>
          <option value="preventive">Preventive</option>
        </select>

        <select
          value={filterCrop}
          onChange={(e) => setFilterCrop(e.target.value)}
          className="text-sm border-gray-200 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500"
        >
          <option value="all">All Crops</option>
          <option value="paddy">Paddy</option>
          <option value="wheat">Wheat</option>
        </select>
      </div>

      {/* Advisory List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-500">
            No advisories match your filters.
          </div>
        ) : (
          filtered.map(advisory => (
            <div
              key={advisory.id}
              className={cn(
                "bg-white rounded-xl p-5 border shadow-sm transition-all relative overflow-hidden",
                advisory.isRead ? "border-gray-100 opacity-80" : "border-l-4 border-green-500 border-y-gray-100 border-r-gray-100"
              )}
            >
              {!advisory.isRead && (
                <div className="absolute top-5 right-5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}

              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-lg shrink-0">
                  {getIcon(advisory.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      getSeverityColor(advisory.severity)
                    )}>
                      {advisory.severity}
                    </span>
                    {advisory.crop && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {advisory.crop}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                      <Calendar className="w-3 h-3" />
                      {formatDate(advisory.date)}
                    </div>
                  </div>

                  <h3 className={cn(
                    "text-lg font-semibold mb-2",
                    advisory.isRead ? "text-gray-700" : "text-gray-900"
                  )}>
                    {advisory.title}
                  </h3>

                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {advisory.message}
                  </p>

                  {!advisory.isRead && advisory.id !== undefined && (
                    <button
                      onClick={() => markAsRead(advisory.id!)}
                      className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
