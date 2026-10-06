import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/database';
import { Droplets, Clock, Zap, IndianRupee, Settings2, Save } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';

export default function IrrigationPage() {
  const { user } = useAuthStore();
  const [fields, setFields] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    fieldId: '',
    area: 1,
    areaUnit: 'acres',
    motorHP: 5,
    motorEfficiency: 70,
    pipelineDiameter: 75,
    waterDepth: 10,
    soilType: 'loam',
    cropType: 'paddy',
    growthStage: 'tillering'
  });

  const [results, setResults] = useState<any>(null);



  const loadData = useCallback(async () => {
    try {
      if (!user?.id) return;
      if (db.fields) setFields(await db.fields.where('userId').equals(user.id).toArray());
      if (db.irrigationRecords) setHistory(await db.irrigationRecords.where('userId').equals(user.id).toArray());
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // IndexedDB reads synchronize external persisted state; event handlers reuse this loader.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, [loadData]);

  const calculate = () => {
    let baseWaterPerWeek = formData.cropType === 'paddy' ? 60 : 40;
    if (formData.soilType === 'sandy') baseWaterPerWeek *= 1.2;
    if (formData.soilType === 'clay') baseWaterPerWeek *= 0.9;

    let areaMultiplier = 1;
    if (formData.areaUnit === 'acres') areaMultiplier = 4046.86;
    if (formData.areaUnit === 'hectares') areaMultiplier = 10000;
    if (formData.areaUnit === 'bigha') areaMultiplier = 2529.29; // approximate

    // Water needed in liters
    const waterNeeded = baseWaterPerWeek * areaMultiplier * formData.area;

    // Flow rate (LPM)
    const flowRateLPM = (formData.motorHP * 746 * (formData.motorEfficiency / 100)) / (9.81 * formData.waterDepth * 1000) * 60000;

    // Duration in hours
    const durationHours = waterNeeded / (flowRateLPM * 60);

    // Electricity consumption
    const electricityKWh = formData.motorHP * 0.746 * durationHours;

    // Cost
    const cost = electricityKWh * 8;

    setResults({
      waterNeeded,
      flowRateLPM,
      durationHours,
      electricityKWh,
      cost
    });
  };

  const handleSave = async () => {
    if (!results) return;
    try {
      if (db.irrigationRecords) {
        await db.irrigationRecords.add({
          userId: user?.id,
          date: new Date().toISOString(),
          ...formData,
          ...results
        });
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Water Irrigation Calculator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-green-100">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings2 className="text-green-600" /> Parameters
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Field</label>
              <select className="w-full p-2 border rounded-lg" value={formData.fieldId} onChange={e => setFormData({...formData, fieldId: e.target.value})}>
                <option value="">Select Field...</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Area</label>
                <input type="number" className="w-full p-2 border rounded-lg" value={formData.area} onChange={e => setFormData({...formData, area: Number(e.target.value)})} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select className="w-full p-2 border rounded-lg" value={formData.areaUnit} onChange={e => setFormData({...formData, areaUnit: e.target.value})}>
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="bigha">Bigha</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Motor HP</label>
                <select className="w-full p-2 border rounded-lg" value={formData.motorHP} onChange={e => setFormData({...formData, motorHP: Number(e.target.value)})}>
                  {[1, 1.5, 2, 3, 5, 7.5, 10].map(hp => <option key={hp} value={hp}>{hp} HP</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pipe Dia (mm)</label>
                <select className="w-full p-2 border rounded-lg" value={formData.pipelineDiameter} onChange={e => setFormData({...formData, pipelineDiameter: Number(e.target.value)})}>
                  {[50, 75, 100, 150].map(d => <option key={d} value={d}>{d} mm</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex justify-between">
                <span>Motor Efficiency</span>
                <span className="text-green-600 font-bold">{formData.motorEfficiency}%</span>
              </label>
              <input type="range" min="50" max="95" className="w-full accent-green-600" value={formData.motorEfficiency} onChange={e => setFormData({...formData, motorEfficiency: Number(e.target.value)})} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Water Depth (m)</label>
              <input type="number" className="w-full p-2 border rounded-lg" value={formData.waterDepth} onChange={e => setFormData({...formData, waterDepth: Number(e.target.value)})} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Soil Type</label>
                <select className="w-full p-2 border rounded-lg" value={formData.soilType} onChange={e => setFormData({...formData, soilType: e.target.value})}>
                  {['clay', 'loam', 'sandy', 'silt'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Crop Type</label>
                <select className="w-full p-2 border rounded-lg" value={formData.cropType} onChange={e => setFormData({...formData, cropType: e.target.value})}>
                  <option value="paddy">Paddy</option>
                  <option value="wheat">Wheat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Growth Stage</label>
              <select className="w-full p-2 border rounded-lg" value={formData.growthStage} onChange={e => setFormData({...formData, growthStage: e.target.value})}>
                <option value="seedling">Seedling</option>
                <option value="tillering">Tillering</option>
                <option value="flowering">Flowering</option>
                <option value="maturity">Maturity</option>
              </select>
            </div>

            <button onClick={calculate} className="w-full bg-green-600 text-white p-3 rounded-xl font-semibold hover:bg-green-700 transition">
              Calculate Needs
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {results ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
                  <div className="p-4 bg-blue-100 rounded-full text-blue-600"><Droplets size={32} /></div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Water Needed</p>
                    <p className="text-2xl font-bold">{Math.round(results.waterNeeded).toLocaleString()} L</p>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 flex items-center gap-4">
                  <div className="p-4 bg-purple-100 rounded-full text-purple-600"><Clock size={32} /></div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Duration</p>
                    <p className="text-2xl font-bold">{Math.floor(results.durationHours)}h {Math.round((results.durationHours % 1) * 60)}m</p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 flex items-center gap-4">
                  <div className="p-4 bg-yellow-100 rounded-full text-yellow-600"><Zap size={32} /></div>
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Electricity</p>
                    <p className="text-2xl font-bold">{results.electricityKWh.toFixed(1)} kWh</p>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center gap-4">
                  <div className="p-4 bg-green-100 rounded-full text-green-600"><IndianRupee size={32} /></div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Est. Cost</p>
                    <p className="text-2xl font-bold">₹{results.cost.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
                <h3 className="font-semibold text-lg mb-2">Recommendations</h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700">
                  <li>Irrigation Schedule: Consider irrigating in the early morning or late evening to minimize evaporation losses.</li>
                  {formData.soilType === 'sandy' && <li>Tip: Your sandy soil drains quickly. Split the {Math.floor(results.durationHours)} hours of irrigation into 2-3 shorter sessions across the week.</li>}
                  {formData.soilType === 'clay' && <li>Tip: Clay soil holds water well but is prone to runoff. Avoid continuous irrigation; a slow application rate is recommended.</li>}
                </ul>
                <div className="mt-4 flex justify-end">
                  <button onClick={handleSave} className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200">
                    <Save size={18} /> Save Record
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400">Fill in the parameters and calculate to see results.</p>
            </div>
          )}

          {history.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-lg mb-4">Past Calculations</h3>
              <div className="space-y-3">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{h.cropType} - {h.area} {h.areaUnit}</p>
                      <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">₹{h.cost?.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">{Math.round(h.waterNeeded || 0).toLocaleString()}L</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
