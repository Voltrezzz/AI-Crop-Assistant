import React, { useState, useEffect } from 'react';
import { db } from '@/db/database';
import { cn } from '@/utils';
import { Calculator, TrendingUp, Download, IndianRupee, MapPin, Store, Leaf, Save, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PrototypeNotice from '@/components/PrototypeNotice';

type Crop = 'Paddy' | 'Wheat';
type Quality = 'A' | 'B' | 'C';
type Stage = 'pre' | 'post';

const DEMO_PRICES = {
  Paddy: [
    { market: 'Thanjavur Govt Mandi', type: 'Govt', min: 2100, max: 2350, modal: 2200 },
    { market: 'Private Trader Thanjavur', type: 'Private', min: 2000, max: 2280, modal: 2150 },
    { market: 'TN Coop Marketing', type: 'Cooperative', min: 2150, max: 2300, modal: 2220 },
    { market: 'e-NAM Online', type: 'Online', min: 2180, max: 2400, modal: 2280 },
  ],
  Wheat: [
    { market: 'Karnal Govt Mandi', type: 'Govt', min: 2200, max: 2500, modal: 2350 },
    { market: 'Private Trader Karnal', type: 'Private', min: 2100, max: 2450, modal: 2300 },
    { market: 'FCI Procurement', type: 'Govt (MSP)', min: 2275, max: 2275, modal: 2275 },
  ]
};

const CHART_DATA = {
  Paddy: [
    { month: 'Mar', govt: 2100, private: 2050, online: 2150 },
    { month: 'Apr', govt: 2150, private: 2100, online: 2200 },
    { month: 'May', govt: 2180, private: 2120, online: 2250 },
    { month: 'Jun', govt: 2200, private: 2150, online: 2280 },
    { month: 'Jul', govt: 2200, private: 2160, online: 2300 },
    { month: 'Aug', govt: 2250, private: 2200, online: 2350 },
  ],
  Wheat: [
    { month: 'Mar', govt: 2150, private: 2100, online: 2200 },
    { month: 'Apr', govt: 2200, private: 2150, online: 2250 },
    { month: 'May', govt: 2250, private: 2200, online: 2300 },
    { month: 'Jun', govt: 2275, private: 2250, online: 2350 },
    { month: 'Jul', govt: 2300, private: 2280, online: 2400 },
    { month: 'Aug', govt: 2350, private: 2300, online: 2450 },
  ]
};

const VARIETIES = {
  Paddy: ['BPT 5204', 'IR 64', 'Ponni', 'Basmati'],
  Wheat: ['HD 2967', 'PBW 343', 'Lok 1', 'Sharbati']
};

const STATES = ['Tamil Nadu', 'Andhra Pradesh', 'Punjab', 'Haryana', 'UP', 'Karnataka', 'Maharashtra'];

export default function MarketAnalysisPage() {
  const [stage, setStage] = useState<Stage>('pre');
  const [crop, setCrop] = useState<Crop>('Paddy');
  const [variety, setVariety] = useState(VARIETIES['Paddy'][0]);
  const [state, setState] = useState(STATES[0]);

  // Pre-harvest state
  const [area, setArea] = useState<number>(5);
  const [expectedYield, setExpectedYield] = useState<number>(20);
  const [quality, setQuality] = useState<Quality>('A');
  const [moisture, setMoisture] = useState<number>(14);

  // Post-harvest state
  const [actualYield, setActualYield] = useState<number>(100);

  // Output
  const [saved, setSaved] = useState(false);

  const totalYield = area * expectedYield;
  const currentPrices = DEMO_PRICES[crop];
  
  const bestMarket = [...currentPrices].sort((a, b) => b.modal - a.modal)[0];
  const expectedRevenue = totalYield * bestMarket.modal;
  const actualRevenue = actualYield * bestMarket.modal;

  const handleSave = async () => {
    try {
      await db.harvestAnalysis?.add({
        crop: crop.toLowerCase(),
        variety,
        estimatedYieldKg: totalYield * 100,
        actualYieldKg: actualYield * 100,
        qualityGrade: quality as any,
        moistureContent: moisture,
        harvestDate: new Date().toISOString(),
        stage: stage === 'pre' ? 'pre_harvest' : 'post_harvest',
        bestMarket: bestMarket.market,
        bestPrice: bestMarket.modal,
        recommendations: [`Sell at ${bestMarket.market} for best price`],
        storageAdvice: moisture > 14 ? ['Dry crops to reduce moisture'] : ['Store safely']
      } as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <PrototypeNotice>Market prices and recommendations are sample records and must be verified with a current mandi source.</PrototypeNotice>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Market & Harvest Analysis</h1>
          <p className="text-gray-600">Analyze market prices and estimate revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-green-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Crop</label>
          <select 
            value={crop} 
            onChange={(e) => {
              const c = e.target.value as Crop;
              setCrop(c);
              setVariety(VARIETIES[c][0]);
            }}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="Paddy">Paddy</option>
            <option value="Wheat">Wheat</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
          <select 
            value={variety} 
            onChange={(e) => setVariety(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
          >
            {VARIETIES[crop].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select 
            value={state} 
            onChange={(e) => setState(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
          >
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden mb-6">
        <div className="p-4 bg-green-50 border-b border-green-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
            <Store className="w-5 h-5" /> Current Market Prices
          </h2>
          <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">₹ per quintal</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-700">Market</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Min Price</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Max Price</th>
                <th className="p-4 text-sm font-semibold text-green-700">Modal Price</th>
              </tr>
            </thead>
            <tbody>
              {currentPrices.map((price, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-800">{price.market}</td>
                  <td className="p-4 text-sm text-gray-600">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      price.type.includes('Govt') ? 'bg-blue-100 text-blue-700' :
                      price.type.includes('Private') ? 'bg-orange-100 text-orange-700' :
                      price.type.includes('Online') ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    )}>
                      {price.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">₹{price.min}</td>
                  <td className="p-4 text-sm text-gray-600">₹{price.max}</td>
                  <td className="p-4 text-sm font-bold text-green-700">₹{price.modal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4 mb-6 h-80">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" /> 6-Month Price Trend
        </h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={CHART_DATA[crop]} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 100', 'dataMax + 100']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" name="Govt Mandi" dataKey="govt" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" name="Private" dataKey="private" stroke="#f97316" strokeWidth={2} />
            <Line type="monotone" name="Online (e-NAM)" dataKey="online" stroke="#a855f7" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setStage('pre')}
          className={cn(
            "flex-1 py-3 px-4 rounded-lg font-medium transition-colors border",
            stage === 'pre' ? "bg-green-600 text-white border-green-700" : "bg-white text-gray-600 border-gray-200 hover:bg-green-50"
          )}
        >
          Pre-Harvest Analysis
        </button>
        <button
          onClick={() => setStage('post')}
          className={cn(
            "flex-1 py-3 px-4 rounded-lg font-medium transition-colors border",
            stage === 'post' ? "bg-green-600 text-white border-green-700" : "bg-white text-gray-600 border-gray-200 hover:bg-green-50"
          )}
        >
          Post-Harvest Analysis
        </button>
      </div>

      {stage === 'pre' && (
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area (Acres)</label>
              <input type="number" value={area} onChange={e => setArea(Number(e.target.value))} className="w-full border rounded p-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Yield (Qtl/Acre)</label>
              <input type="number" value={expectedYield} onChange={e => setExpectedYield(Number(e.target.value))} className="w-full border rounded p-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
              <select value={quality} onChange={e => setQuality(e.target.value as Quality)} className="w-full border rounded p-2 focus:ring-green-500">
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Fair)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moisture %</label>
              <input type="number" value={moisture} onChange={e => setMoisture(Number(e.target.value))} className="w-full border rounded p-2 focus:ring-green-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Estimated Yield</h3>
              <p className="text-2xl font-bold text-blue-900">{totalYield} Quintals</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Expected Revenue</h3>
              <p className="text-2xl font-bold text-green-900">₹{expectedRevenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-green-700 mt-1">Based on best market: {bestMarket.market}</p>
            </div>
            <div className={cn("p-4 rounded-lg border", moisture > 14 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
              <h3 className="text-sm font-semibold mb-2">Storage Advice</h3>
              <div className="flex items-start gap-2">
                <AlertCircle className={cn("w-5 h-5 shrink-0", moisture > 14 ? "text-amber-600" : "text-emerald-600")} />
                <p className="text-sm">
                  {moisture > 14 
                    ? `High moisture (${moisture}%). Needs drying before storage to prevent fungal growth.` 
                    : `Good moisture level (${moisture}%). Safe for long-term storage in dry warehouse.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === 'post' && (
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Yield Harvested (Quintals)</label>
              <input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="w-full border rounded p-3 text-lg focus:ring-green-500" />
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-green-800 mb-1">Potential Revenue</h3>
              <p className="text-3xl font-bold text-green-900">₹{actualRevenue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Revenue Comparison by Market</h3>
            <div className="space-y-3">
              {currentPrices.sort((a,b)=>b.modal - a.modal).map((price, idx) => {
                const rev = actualYield * price.modal;
                const isBest = idx === 0;
                return (
                  <div key={idx} className={cn("flex justify-between items-center p-3 rounded-lg border", isBest ? "bg-green-50 border-green-300" : "border-gray-200 bg-white")}>
                    <div>
                      <p className="font-medium text-gray-800">{price.market} <span className="text-xs text-gray-500 font-normal">({price.type})</span></p>
                      <p className="text-sm text-gray-600">₹{price.modal} / quintal</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-bold", isBest ? "text-green-700" : "text-gray-800")}>₹{rev.toLocaleString('en-IN')}</p>
                      {isBest && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">Highest Return</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Recommendation</h3>
            <p className="text-sm text-blue-900 mb-2">
              Based on current prices, selling at <strong>{bestMarket.market}</strong> provides the highest return of <strong>₹{bestMarket.modal}/qtl</strong>.
            </p>
            {currentPrices.find(p => p.type.includes('Govt (MSP)')) && (
              <p className="text-sm text-blue-900">
                Government MSP provides a guaranteed baseline. Consider online platforms like e-NAM for potential upside.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {saved ? <><Save className="w-5 h-5"/> Saved!</> : <><Save className="w-5 h-5"/> Save Analysis</>}
        </button>
      </div>
    </div>
  );
}
