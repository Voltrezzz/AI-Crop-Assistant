import React, { useState, useEffect } from 'react';
import { Map, Plus, Trash2, Droplets } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { db } from '@/db/database';
import { LandParcel } from '@/types';
import { cn } from '@/utils';
import DocumentDrive from '@/components/DocumentDrive';
import { useAuthStore } from '@/stores/authStore';

const COLORS = {
  paddy: '#22c55e',
  wheat: '#eab308',
  vegetables: '#f97316',
  fruits: '#ec4899',
  fallow: '#9ca3af',
  grazing: '#84cc16',
  other: '#6366f1'
};

const DEMO_PARCELS: Omit<LandParcel, 'id'>[] = [
  { name: 'North Paddy', area: 2.4, areaUnit: 'acres', crop: 'paddy', variety: 'Basmati', soilType: 'loam', irrigationType: 'canal', status: 'cultivated', color: COLORS.paddy, notes: '' },
  { name: 'East Paddy', area: 1.8, areaUnit: 'acres', crop: 'paddy', variety: 'IR64', soilType: 'clay', irrigationType: 'borewell', status: 'cultivated', color: COLORS.paddy, notes: '' },
  { name: 'West Wheat', area: 3.1, areaUnit: 'acres', crop: 'wheat', variety: 'Sharbati', soilType: 'loam', irrigationType: 'borewell', status: 'cultivated', color: COLORS.wheat, notes: '' },
  { name: 'Kitchen Garden', area: 0.5, areaUnit: 'acres', crop: 'vegetables', variety: 'Mixed', soilType: 'sandy', irrigationType: 'drip', status: 'cultivated', color: COLORS.vegetables, notes: '' },
  { name: 'Grazing Land', area: 1.2, areaUnit: 'acres', crop: 'grazing', variety: 'Grass', soilType: 'sandy', irrigationType: 'rainfed', status: 'fallow', color: COLORS.grazing, notes: '' }
];

export default function LandSegregationPage() {
  const { user } = useAuthStore();
  const [totalArea, setTotalArea] = useState(0);
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newParcel, setNewParcel] = useState<Omit<LandParcel, 'id'>>({
    name: '', area: 1, areaUnit: 'acres', crop: 'paddy', variety: '', soilType: 'loam', irrigationType: 'borewell', status: 'cultivated', color: COLORS.paddy, notes: ''
  });

  useEffect(() => {
    loadParcels();
  }, [user?.id]);

  const loadParcels = async () => {
    try {
      if (db.landParcels) {
        if (!user?.id) {
          setParcels([]);
          return;
        }
        let items = await db.landParcels.where('userId').equals(user.id).toArray();
        if (items.length === 0 && user.isDemo) {
          for (let p of DEMO_PARCELS) {
            await db.landParcels.add({ ...p, userId: user.id } as LandParcel);
          }
          items = await db.landParcels.where('userId').equals(user.id).toArray();
        }
        setParcels(items);
        const sum = items.reduce((acc, p) => acc + Number(p.area), 0);
        if (sum > totalArea) setTotalArea(Math.ceil(sum));
      }
    } catch (e) {
      console.error(e);
      setParcels([]);
    }
  };

  const handleAdd = async () => {
    try {
      if (db.landParcels) {
        const pColor = (COLORS as any)[newParcel.crop] || COLORS.fallow;
        if (!user?.id) return;
        await db.landParcels.add({ ...newParcel, color: pColor, userId: user.id } as LandParcel);
        loadParcels();
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      if (db.landParcels) {
        const parcel = await db.landParcels.get(id);
        if (parcel?.userId === user?.id) await db.landParcels.delete(id);
        loadParcels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cultivatedArea = parcels.filter(p => p.status === 'cultivated').reduce((sum, p) => sum + p.area, 0);
  const fallowArea = parcels.filter(p => p.status === 'fallow' || p.status === 'preparation').reduce((sum, p) => sum + p.area, 0);
  
  const pieData = Object.keys(COLORS).map(cropKey => {
    const area = parcels.filter(p => p.crop?.toLowerCase() === cropKey.toLowerCase()).reduce((acc, p) => acc + Number(p.area), 0);
    return { name: cropKey.charAt(0).toUpperCase() + cropKey.slice(1), value: area, color: (COLORS as any)[cropKey] };
  }).filter(c => c.value > 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-800">Land Segregation</h1>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <label className="text-sm font-medium text-gray-500">Total Farm Area (Acres)</label>
          <input type="number" className="w-20 p-1 font-bold text-lg outline-none" value={totalArea} onChange={e => setTotalArea(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total Area</p>
          <p className="text-2xl font-bold">{totalArea} Ac</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Cultivated</p>
          <p className="text-2xl font-bold">{((cultivatedArea / totalArea) * 100 || 0).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-400">
          <p className="text-sm text-gray-500">Fallow/Prep</p>
          <p className="text-2xl font-bold">{((fallowArea / totalArea) * 100 || 0).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Parcels</p>
          <p className="text-2xl font-bold">{parcels.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Map className="text-green-600"/> Farm Map</h2>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700">
              <Plus size={16} /> Add Parcel
            </button>
          </div>
          
          <div className="w-full min-h-[200px] bg-green-50 rounded-xl relative overflow-hidden border-2 border-green-100 flex flex-wrap p-2 gap-2">
            {parcels.map((p, i) => (
              <div 
                key={i} 
                className="flex items-center justify-center text-white font-semibold text-sm rounded-lg shadow-sm transition-transform hover:scale-[1.02]"
                style={{
                  backgroundColor: p.color,
                  width: `${(p.area / totalArea) * 100}%`,
                  flexGrow: p.area,
                  minHeight: '80px'
                }}
                title={`${p.name} - ${p.area} acres`}
              >
                {p.name}
              </div>
            ))}
            {parcels.length === 0 && <p className="w-full self-center text-center text-green-800">No farm data yet</p>}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {parcels.map((p, idx) => (
              <div key={p.id || idx} className="p-4 rounded-xl border border-gray-100 flex justify-between items-start hover:border-gray-300 transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                    <h3 className="font-semibold">{p.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{p.area} Acres • <span className="capitalize">{p.crop}</span></p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full capitalize">{p.status}</span>
                    <span className="text-xs text-blue-600 flex items-center gap-1 capitalize"><Droplets size={12}/> {p.irrigationType}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">Crop Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} acres`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Embedded Document Drive */}
      <DocumentDrive />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Land Parcel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input type="text" className="w-full p-2 border rounded" value={newParcel.name} onChange={e => setNewParcel({...newParcel, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Area (Acres)</label>
                  <input type="number" className="w-full p-2 border rounded" value={newParcel.area} onChange={e => setNewParcel({...newParcel, area: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Crop</label>
                  <select className="w-full p-2 border rounded capitalize" value={newParcel.crop} onChange={e => setNewParcel({...newParcel, crop: e.target.value as any})}>
                    {Object.keys(COLORS).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Irrigation</label>
                <select className="w-full p-2 border rounded capitalize" value={newParcel.irrigationType} onChange={e => setNewParcel({...newParcel, irrigationType: e.target.value as any})}>
                  <option value="borewell">Borewell</option><option value="canal">Canal</option><option value="drip">Drip</option><option value="rainfed">Rainfed</option><option value="sprinkler">Sprinkler</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 p-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleAdd} className="flex-1 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
