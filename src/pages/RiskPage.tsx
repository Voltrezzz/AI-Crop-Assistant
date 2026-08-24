import React, { useState, useEffect } from 'react';
import { Activity, Thermometer, Droplets, CloudRain, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/db/database';
import { cn, getRiskColor } from '@/utils';
import { Field } from '@/types';
import PrototypeNotice from '@/components/PrototypeNotice';
import { useAuthStore } from '@/stores/authStore';

export default function RiskPage() {
  const { user } = useAuthStore();
  const [fields, setFields] = useState<Field[]>([]);
  const [overallRisk, setOverallRisk] = useState<'Low' | 'Medium' | 'High' | 'Extreme'>('Low');
  const [riskScore, setRiskScore] = useState(25);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setFields([]);
        return;
      }
      const allFields = await db.fields.where('userId').equals(user.id).toArray();
      setFields(allFields);
      
      // Calculate a dummy overall risk based on some logic
      const weather = await db.weather.toArray();
      const currentW = weather[weather.length - 1] || { humidity: 82, rainfall: 15, temperature: 30 };
      
      let score = 20;
      if (currentW.humidity > 80) score += 30;
      if (currentW.rainfall > 10) score += 20;
      if (currentW.temperature > 28 && currentW.temperature < 32) score += 10;
      
      setRiskScore(Math.min(100, score));
      if (score < 30) setOverallRisk('Low');
      else if (score < 60) setOverallRisk('Medium');
      else if (score < 80) setOverallRisk('High');
      else setOverallRisk('Extreme');
    };
    loadData();
  }, [user?.id]);

  const trendData = [
    { day: 'Mon', risk: 20 },
    { day: 'Tue', risk: 25 },
    { day: 'Wed', risk: 40 },
    { day: 'Thu', risk: 65 },
    { day: 'Fri', risk: 80 },
    { day: 'Sat', risk: 75 },
    { day: 'Sun', risk: riskScore },
  ];

  // SVG Gauge calculation
  const radius = 60;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  const riskColorHex = riskScore < 30 ? '#22c55e' : riskScore < 60 ? '#eab308' : riskScore < 80 ? '#f97316' : '#ef4444';

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <PrototypeNotice>Risk scores and trends are demonstration heuristics, not a live agronomic risk service.</PrototypeNotice>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Disease Risk Assessment</h1>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200">
          Prototype Risk Assessment
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Risk Gauge */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-6">Overall Farm Risk</h2>
          
          <div className="relative w-48 h-24 mb-4 flex items-end justify-center overflow-hidden">
            {/* Background Arch */}
            <svg className="absolute w-48 h-48" viewBox="0 0 140 140">
              <path
                d="M 20 70 A 50 50 0 0 1 120 70"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Value Arch */}
              <path
                d="M 20 70 A 50 50 0 0 1 120 70"
                fill="none"
                stroke={riskColorHex}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-0 text-3xl font-bold" style={{ color: riskColorHex }}>
              {overallRisk}
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Risk Score: <span className="font-semibold text-gray-700">{riskScore}/100</span>
          </p>
        </div>

        {/* Risk Factors */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Activity className="text-blue-500" /> Active Risk Factors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="text-blue-500 w-5 h-5" />
                <span className="font-semibold text-gray-800">High Humidity ({'>'} 80%)</span>
              </div>
              <p className="text-sm text-gray-600">Elevated humidity strongly favors fungal spore germination and spread.</p>
            </div>
            
            <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/50">
              <div className="flex items-center gap-2 mb-2">
                <CloudRain className="text-blue-600 w-5 h-5" />
                <span className="font-semibold text-gray-800">Recent Rainfall ({'>'} 10mm)</span>
              </div>
              <p className="text-sm text-gray-600">Wet leaf surfaces allow pathogens to infect plant tissues more easily.</p>
            </div>
            
            <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="text-orange-500 w-5 h-5" />
                <span className="font-semibold text-gray-800">Optimal Temperature</span>
              </div>
              <p className="text-sm text-gray-600">Current temps (28-32°C) are ideal for rapid multiplication of bacterial pathogens.</p>
            </div>

            <div className="p-4 rounded-xl border border-green-100 bg-green-50/50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="text-green-600 w-5 h-5" />
                <span className="font-semibold text-gray-800">Growth Stage Vulnerability</span>
              </div>
              <p className="text-sm text-gray-600">Approaching flowering stage; crops are typically more susceptible to blast.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Historical Risk Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={riskColorHex} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={riskColorHex} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="risk" stroke={riskColorHex} strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Risk Reduction Actions</h2>
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Apply Preventive Fungicide</h4>
                <p className="text-sm text-gray-600">Consider a prophylactic spray of Propiconazole before disease onset.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Ensure Field Drainage</h4>
                <p className="text-sm text-gray-600">Clear drainage channels to prevent standing water and reduce micro-climate humidity.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Increase Scouting Frequency</h4>
                <p className="text-sm text-gray-600">Inspect lower canopy leaves every 2 days for initial spotting symptoms.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Level Risk */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Risk by Field</h2>
        {fields.length === 0 ? (
          <p className="text-gray-500 italic">No fields configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 font-semibold text-gray-500">Field Name</th>
                  <th className="pb-3 font-semibold text-gray-500">Crop</th>
                  <th className="pb-3 font-semibold text-gray-500">Risk Level</th>
                  <th className="pb-3 font-semibold text-gray-500">Action Required</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(field => {
                  // Randomize risk for demo
                  const risks = ['Low', 'Medium', 'High'];
                  const fieldIdNum = field.id ?? 0;
                  const fieldRisk = risks[fieldIdNum % 3] as 'Low' | 'Medium' | 'High';
                  return (
                    <tr key={field.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-4 font-medium text-gray-900">{field.name}</td>
                      <td className="py-4 text-gray-600 capitalize">{field.crop}</td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border",
                          getRiskColor(fieldRisk)
                        )}>
                          {fieldRisk}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {fieldRisk === 'High' ? 'Immediate inspection needed' : fieldRisk === 'Medium' ? 'Monitor closely' : 'Routine care'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
