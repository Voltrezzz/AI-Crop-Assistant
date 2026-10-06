import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { Field, CropType, CropCycle } from '@/types';
import { startCropCycle } from '@/services/harvestService';
import { ArrowLeft, CheckCircle2, ChevronRight, Calculator, Leaf, Droplets, MapPin, IndianRupee, Sprout } from 'lucide-react';


type PlanStep = 'inputs' | 'recommendation' | 'details' | 'saved';

export default function CropPlanPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<PlanStep>('inputs');
  const [fields, setFields] = useState<Field[]>([]);

  // Inputs
  const [selectedField, setSelectedField] = useState<number | ''>('');
  const [soilType, setSoilType] = useState('clay');
  const [soilPh, setSoilPh] = useState('6.5');
  const [season, setSeason] = useState('kharif'); // Kharif, Rabi, Zaid
  const [waterAvail, setWaterAvail] = useState('high'); // high, medium, low

  // Calculated Plan
  const [recCrop, setRecCrop] = useState<CropType>('paddy');
  const [recExplanation, setRecExplanation] = useState('');
  const [seedQty, setSeedQty] = useState(0);
  const [estCost, setEstCost] = useState(0);
  const [estIncome, setEstIncome] = useState(0);
  const [waterReq, setWaterReq] = useState('');
  const [fertilizerPlan, setFertilizerPlan] = useState('');

  useEffect(() => {
    if (user?.id) {
      db.fields.where('userId').equals(user.id).toArray().then(setFields);
    }
  }, [user?.id]);

  const generatePlan = () => {
    // Deterministic rules
    let selectedCrop: CropType;
    let explanation: string;

    if (waterAvail === 'high' && soilType === 'clay' && season === 'kharif') {
      selectedCrop = 'paddy';
      explanation = 'This illustrative rule selects paddy for Kharif, clay soil and high water availability. Local suitability is not evaluated.';
    } else if (waterAvail === 'medium' && season === 'rabi') {
      selectedCrop = 'wheat';
      explanation = 'This illustrative rule selects wheat for Rabi and medium water availability. Local suitability is not evaluated.';
    } else {
      // Default fallback recommending drought-resistant if water is low
      if (waterAvail === 'low') {
        selectedCrop = 'wheat'; // Should be millets ideally, but limited to CropType enum (paddy|wheat)
        explanation = 'The preview only supports rice and wheat and cannot recommend a suitable low-water crop. Consult a local adviser before starting a cycle.';
      } else {
        selectedCrop = 'paddy';
        explanation = 'This preview defaults to paddy. No regional climate data has been evaluated.';
      }
    }

    const field = fields.find(f => f.id === Number(selectedField));
    if (!field || !Number.isFinite(field.area) || field.area <= 0) { setError('Choose a field with a valid area.'); return; }
    if (!['acres', 'acre', 'hectares', 'hectare'].includes(field.areaUnit.toLowerCase())) { setError('This estimate supports acres or hectares only.'); return; }
    setError('');
    const areaAcres = field.area * (field.areaUnit.toLowerCase().startsWith('hectare') ? 2.47105 : 1);

    setRecCrop(selectedCrop);
    setRecExplanation(explanation);

    if (selectedCrop === 'paddy') {
      setSeedQty(30 * areaAcres);
      setEstCost(15000 * areaAcres);
      setEstIncome(44000 * areaAcres);
      setWaterReq('~1200 mm/season. Requires continuous ponding initially.');
      setFertilizerPlan('Use a current soil test and local agronomist recommendation before choosing fertilizers or doses.');
    } else {
      setSeedQty(40 * areaAcres);
      setEstCost(12000 * areaAcres);
      setEstIncome(34500 * areaAcres);
      setWaterReq('~450 mm/season. 4-6 irrigations at critical stages.');
      setFertilizerPlan('Use a current soil test and local agronomist recommendation before choosing fertilizers or doses.');
    }

    setStep('recommendation');
  };

  const saveCropCycle = async () => {
    if (!user?.id || !selectedField || saving) return;
    setSaving(true);
    setError('');

    try {
      const field = fields.find(f => f.id === Number(selectedField));
      if (!field) return;

      const cycle: Omit<CropCycle, 'id'> = {
        userId: user.id,
        fieldId: field.id!,
        crop: recCrop,
        variety: 'Not specified',
        startDate: new Date().toISOString(),
        expectedEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        currentStage: recCrop === 'paddy' ? 'nursery' : 'germination',
        status: 'active'
      };

      await startCropCycle(user.id, cycle);

      setStep('saved');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save crop cycle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="mr-4 text-neutral-500 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Crop Planning Preview</h1>
          <p className="text-neutral-500 text-sm">Illustrative planning rules and cost estimates; confirm suitability locally.</p>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      <p className="mb-4 text-sm text-amber-800">Preview only: location, weather and soil pH are not evaluated. Quantities and income are sample estimates, not a prescription or forecast.</p>
      {step === 'inputs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            Farm & Soil Context
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Select Field</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 outline-none focus:border-green-500"
              >
                <option value="">-- Choose a field --</option>
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.area} {f.areaUnit})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Soil Type</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 outline-none focus:border-green-500"
                >
                  <option value="clay">Clay (Heavy)</option>
                  <option value="loam">Loam (Medium)</option>
                  <option value="sandy">Sandy (Light)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Soil pH</label>
                <input
                  type="number"
                  step="0.1"
                  value={soilPh}
                  onChange={(e) => setSoilPh(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 outline-none focus:border-green-500"
                >
                  <option value="kharif">Kharif (Monsoon)</option>
                  <option value="rabi">Rabi (Winter)</option>
                  <option value="zaid">Zaid (Summer)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Water Availability</label>
                <select
                  value={waterAvail}
                  onChange={(e) => setWaterAvail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 outline-none focus:border-green-500"
                >
                  <option value="high">High (Canals/Borewell)</option>
                  <option value="medium">Medium (Rain + Well)</option>
                  <option value="low">Low (Rainfed only)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={generatePlan}
            disabled={!selectedField}
            className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            Analyze & Generate Plan
          </button>
        </div>
      )}

      {step === 'recommendation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-1">AI Recommendation</h2>
                  <h3 className="text-2xl font-bold text-neutral-900 capitalize flex items-center gap-2">
                    {recCrop} <Leaf className="w-6 h-6 text-green-600" />
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-neutral-700 leading-relaxed bg-green-50 p-4 rounded-xl border border-green-100">
                {recExplanation}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-bold text-neutral-900">Seeds Required</h4>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{seedQty} <span className="text-sm font-medium text-neutral-500">kg</span></p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-cyan-600" />
                </div>
                <h4 className="font-bold text-neutral-900">Water Plan</h4>
              </div>
              <p className="text-sm font-medium text-neutral-700">{waterReq}</p>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
              <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-neutral-500" />
                Financial Estimates
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-xl">
                  <p className="text-sm font-medium text-neutral-500 mb-1">Est. Cultivation Cost</p>
                  <p className="text-xl font-bold text-red-600 flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{estCost.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-sm font-medium text-green-700 mb-1">Expected Income</p>
                  <p className="text-xl font-bold text-green-700 flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{estIncome.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
              <h4 className="font-bold text-neutral-900 mb-2">Fertilizer Plan</h4>
              <p className="text-sm text-neutral-700">{fertilizerPlan}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('inputs')}
              className="flex-1 py-3 px-4 bg-white border border-neutral-300 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              disabled={saving} onClick={saveCropCycle}
              className="flex-2 w-2/3 py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Start Crop Cycle
            </button>
          </div>
        </div>
      )}

      {step === 'saved' && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Crop Plan Saved!</h2>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            Your field is now active with the recommended crop. You can track progress, add activities, and get timely advisories.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="py-3 px-6 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate(`/fields/${selectedField}`)}
              className="py-3 px-6 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              View Field <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
