import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Activity, Layers, ScanLine, CloudSun, Droplets, Wind, AlertTriangle, Settings, Bell, Mic, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/db/database';
import { cn } from '@/utils';
import { useAuthStore } from '@/stores/authStore';
import PrototypeNotice from '@/components/PrototypeNotice';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState({ totalFields: 0, healthyFields: 0, attentionFields: 0, scansThisMonth: 0 });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<Array<{ name: string; score: number }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        if (!user?.id) {
          setStats({ totalFields: 0, healthyFields: 0, attentionFields: 0, scansThisMonth: 0 });
          setRecentScans([]);
          setHealthData([]);
          return;
        }
        const fields = await db.fields.where('userId').equals(user.id).toArray();
        const scans = await db.scans.where('userId').equals(user.id).toArray();
        if (cancelled) return;

        const healthyFields = fields.filter((f: any) => f.status === 'healthy').length;
        const scansThisMonth = scans.filter((s: any) => new Date(s.date).getTime() >= new Date().setDate(1)).length;
        setStats({ totalFields: fields.length, healthyFields, attentionFields: fields.length - healthyFields, scansThisMonth });
        setRecentScans([...scans].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3));
        setHealthData(
          scans
            .filter(scan => typeof scan.healthScore === 'number' && Number.isFinite(scan.healthScore))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-7)
            .map(scan => ({
              name: new Date(scan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              score: Number(scan.healthScore),
            })),
        );
      } catch (err) {
        if (!cancelled) {
          setHealthData([]);
          console.error('Error loading dashboard data', err);
        }
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-neutral-100 font-sans pb-20 md:pb-8">
      <header className="bg-green-700 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6" />
            <span className="font-bold text-lg">Marudham 360</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/notifications')} className="p-2 hover:bg-green-600 rounded-full">
              <Bell className="h-5 w-5" />
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 hover:bg-green-600 rounded-full">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <PrototypeNotice>The health chart uses this account's stored records when available. Disease-risk and weather cards remain sample dashboard visuals.</PrototypeNotice>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Vanakkam, {user?.name || 'Farmer'} 👋</h1>
          <p className="text-neutral-500">Here's your farm overview for today.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 cursor-pointer" onClick={() => navigate('/fields')}>
            <div className="flex items-center gap-3 mb-2 text-neutral-500">
              <Layers className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Total Fields</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">{stats.totalFields}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-2 text-neutral-500">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Healthy</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.healthyFields}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-2 text-neutral-500">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">Attention</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.attentionFields}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 cursor-pointer" onClick={() => navigate('/history')}>
            <div className="flex items-center gap-3 mb-2 text-neutral-500">
              <ScanLine className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Month Scans</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">{stats.scansThisMonth}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-neutral-900">Crop Health Overview</h2>
            </div>
            <div className="h-64 w-full">
              {healthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
                  <Activity className="mb-3 h-10 w-10 text-neutral-300" />
                  <p className="font-medium text-neutral-700">No crop-health history yet</p>
                  <p className="mt-1 max-w-sm text-sm">This chart will show this account's stored health records when available.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-neutral-900 w-full mb-4">Disease Risk Area</h2>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#f59e0b" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.25)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-amber-500">Low</span>
                <span className="text-xs text-neutral-500 mt-1">Current Risk</span>
              </div>
            </div>
            <div className="mt-4 w-full bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">Slight humidity increase may favor early blight. Monitor closely.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Weather Overview</h2>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                  <CloudSun className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-neutral-900">32°C</div>
                  <div className="text-sm text-neutral-500">Partly Cloudy</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 p-3 rounded-xl flex items-center gap-3">
                <Droplets className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-xs text-neutral-500">Humidity</div>
                  <div className="text-sm font-bold text-neutral-900">65%</div>
                </div>
              </div>
              <div className="bg-neutral-50 p-3 rounded-xl flex items-center gap-3">
                <Wind className="h-5 w-5 text-teal-400" />
                <div>
                  <div className="text-xs text-neutral-500">Wind</div>
                  <div className="text-sm font-bold text-neutral-900">12 km/h</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-neutral-900">Recent Scans</h2>
              <button onClick={() => navigate('/history')} className="text-sm font-medium text-green-600">View all</button>
            </div>
            <div className="space-y-3">
              {recentScans.length > 0 ? recentScans.map((scan, i) => (
                <div key={i} className="flex items-center gap-4 p-3 hover:bg-neutral-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-neutral-100">
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                    scan.result === 'healthy' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {scan.result === 'healthy' ? <Activity className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 truncate">
                      {scan.result === 'healthy' ? 'Healthy Crop' : scan.disease || 'Issue Detected'}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate">
                      {new Date(scan.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-neutral-500 text-sm">No recent scans found.</div>
              )}
            </div>
          </div>
        </div>

        <nav aria-label="Farm services" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['documents', 'Document locker'], ['marketplace', 'Marketplace preview'], ['community', 'Community preview'], ['livelihood', 'Livelihood ideas']].map(([route, label]) => <button key={route} className="bg-white rounded-xl p-4 border text-green-800" onClick={() => navigate(`/${route}`)}>{label}</button>)}
        </nav>
        {/* Quick Actions & Next Task & Market */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
             <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-neutral-900">Next Farm Task</h2>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 h-[110px]">
              <Droplets className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900">Irrigation Due</h3>
                <p className="text-sm text-blue-800 mt-1 line-clamp-2">Soil moisture is low in Field 1. Apply 2 inches of water.</p>
                <button onClick={() => navigate('/irrigation')} className="mt-2 text-sm font-bold text-blue-700">Plan Irrigation &rarr;</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">Market Snapshot</h2>
            <div className="flex flex-col justify-between h-[110px]">
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <div className="font-bold text-neutral-900">Paddy (Govt Mandi)</div>
                  <div className="text-xs text-neutral-500">Modal Price</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">₹2,200/q</div>
                  <div className="text-xs text-green-600 flex items-center justify-end"><TrendingUp size={12} className="mr-1"/>+2.5%</div>
                </div>
              </div>
              <button onClick={() => navigate('/market')} className="text-sm font-bold text-green-600 w-full text-center mt-2">View Market Analysis</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/analyzer')} className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-2xl border border-green-100 hover:bg-green-100 transition-colors h-[175px]">
              <div className="bg-green-600 text-white p-3 rounded-full mb-3"><ScanLine size={28} /></div>
              <span className="font-bold text-green-900">Quick Scan</span>
            </button>
            <button onClick={() => navigate('/voice')} className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors h-[175px]">
              <div className="bg-blue-600 text-white p-3 rounded-full mb-3"><Mic size={28} /></div>
              <span className="font-bold text-blue-900">Voice Assistant</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
