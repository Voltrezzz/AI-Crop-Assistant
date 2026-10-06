import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import { saveModuleDraft } from '@/services/moduleDraftService';
import ModuleDraftBoard from '@/components/ModuleDraftBoard';
import React, { useState } from 'react';
import { Briefcase, ArrowRight, Lightbulb, Calculator, IndianRupee, Link as LinkIcon, ShoppingBag, Leaf, BookOpen } from 'lucide-react';
import PrototypeNotice from '@/components/PrototypeNotice';

type BusinessIdea = {
  id: number;
  title: string;
  category: string;
  description: string;
  investment: number;
  operatingCost: number;
  expectedIncome: number;
  roiMonths: number;
  steps: string[];
  schemes: string[];
};

const MOCK_IDEAS: Record<string, BusinessIdea[]> = {
  'agri-waste': [
    {
      id: 1,
      title: 'Paddy Straw Mushroom Cultivation',
      category: 'Agri-Waste Processing',
      description: 'Convert leftover paddy straw into high-value edible mushrooms using simple low-cost sheds.',
      investment: 15000,
      operatingCost: 2000,
      expectedIncome: 8000,
      roiMonths: 3,
      steps: ['Construct a thatched shed', 'Soak and pasteurize paddy straw', 'Spawn inoculation', 'Maintain humidity & harvest in 15 days'],
      schemes: ['NHB Mushroom Subsidies', 'KVK Free Training Program']
    },
    {
      id: 2,
      title: 'Biomass Briquette Production',
      category: 'Agri-Waste Processing',
      description: 'Compress agricultural waste into eco-friendly fuel briquettes for local industries.',
      investment: 120000,
      operatingCost: 15000,
      expectedIncome: 35000,
      roiMonths: 6,
      steps: ['Procure a mini briquette machine', 'Collect dried agri-waste', 'Shred and compress', 'Sell to local brick kilns or boilers'],
      schemes: ['PMEGP Loan Subsidy', 'TEDA Renewable Energy Scheme']
    }
  ],
  'handicraft': [
    {
      id: 3,
      title: 'Palm-Leaf & Coir Handicrafts',
      category: 'Handicraft',
      description: 'Weave traditional baskets, mats, and eco-friendly packaging using local palm leaves and coir.',
      investment: 5000,
      operatingCost: 1000,
      expectedIncome: 12000,
      roiMonths: 1,
      steps: ['Procure raw palm leaves/coir', 'Natural dyeing process', 'Weave products', 'List on Farmer-to-Consumer Market'],
      schemes: ['Coir Board Mahila Yojana', 'Handicrafts Marketing Scheme']
    }
  ],
  'value-added': [
    {
      id: 4,
      title: 'Cold-Pressed Groundnut Oil (Mara Chekku)',
      category: 'Value-Added Farm Products',
      description: 'Extract premium wood-pressed oil from harvested groundnuts for local health-conscious consumers.',
      investment: 250000,
      operatingCost: 40000,
      expectedIncome: 75000,
      roiMonths: 8,
      steps: ['Install a wooden rotary oil mill', 'Procure quality groundnuts', 'Extract and filter oil', 'Bottle and brand'],
      schemes: ['PMFME (Micro Food Processing)', 'MUDRA Loan']
    }
  ]
};

export default function LivelihoodPage() {
  const [step, setStep] = useState(1);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [recommendations, setRecommendations] = useState<BusinessIdea[]>([]);
  const userId = useAuthStore(s => s.user?.id);
  const [saveError, setSaveError] = useState('');
  const [savingIdea, setSavingIdea] = useState(false);
  const savedPlans = useLiveQuery(() => userId ? db.moduleDrafts.where('userId').equals(userId).filter(d => d.kind === 'enterprise').toArray() : [], [userId]);
  const savedIdeas = Object.values(MOCK_IDEAS).flat().filter(idea => savedPlans?.some(plan => plan.title === idea.title)).map(idea => idea.id);
  const [showF2C, setShowF2C] = useState(false);

  const handleGenerate = () => {
    let ideas: BusinessIdea[] = [];
    if (selectedResources.includes('agri-waste')) ideas = [...ideas, ...MOCK_IDEAS['agri-waste']];
    if (selectedSkill === 'weaving') ideas = [...ideas, ...MOCK_IDEAS['handicraft']];
    if (selectedResources.includes('capital') || selectedSkill === 'processing') ideas = [...ideas, ...MOCK_IDEAS['value-added']];

    // Default fallback
    if (ideas.length === 0) {
      ideas = [MOCK_IDEAS['agri-waste'][0], MOCK_IDEAS['handicraft'][0]];
    }

    setRecommendations(ideas);
    setStep(2);
  };

  const toggleSave = async (id: number) => {
    if (!userId || savingIdea || savedIdeas.includes(id)) return;
    const idea = Object.values(MOCK_IDEAS).flat().find(i => i.id === id);
    if (!idea) return;
    setSavingIdea(true); setSaveError('');
    try { await saveModuleDraft({ userId, kind: 'enterprise', title: idea.title, detail: `${idea.description}\n\nSample starting steps:\n${idea.steps.join('\n')}\n\nFinancial figures are illustrative and require local validation.` }); }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'Unable to save plan.'); }
    finally { setSavingIdea(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 pb-24">
      <PrototypeNotice>Illustrative business ideas and sample financial estimates, not income forecasts. Scheme names are unverified references, not application links. Saved plans stay in this browser with your account. Product listings and sales are not connected.</PrototypeNotice>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rural Entrepreneurship</h1>
          <p className="text-gray-600">Discover alternative income streams and value-added businesses</p>
        </div>
        <button onClick={() => setShowF2C(!showF2C)} className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <ShoppingBag size={20} /> D2C Market
        </button>
      </div>

      {saveError && <p role="alert" className="text-red-700 mb-4">{saveError}</p>}
      <div className="mb-6"><ModuleDraftBoard kind="enterprise" title="Your enterprise plans" /></div>
      {showF2C ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><ShoppingBag className="text-amber-600" /> Farmer-to-Consumer (F2C) Marketplace</h2>
          <p className="text-gray-600 mb-6">Connect directly with urban buyers for your value-added products and handicrafts.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 flex gap-4">
              <div className="w-20 h-20 bg-amber-50 rounded flex items-center justify-center shrink-0">
                <Leaf className="text-amber-600 w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Cold-Pressed Groundnut Oil</h3>
                <p className="text-sm text-gray-500 mb-2">By Ramesh Farms (250ml - 1L)</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-600">₹280/L</span>
                  <button disabled title="Product listing is not connected" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-bold">Listing unavailable</button>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 flex gap-4">
              <div className="w-20 h-20 bg-amber-50 rounded flex items-center justify-center shrink-0">
                <ShoppingBag className="text-amber-600 w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Woven Palm-Leaf Basket</h3>
                <p className="text-sm text-gray-500 mb-2">By Selvi Handicrafts</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-600">₹150/pc</span>
                  <button disabled title="Product listing is not connected" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-bold">Listing unavailable</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : step === 1 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2"><Briefcase /> Resource & Skill Audit</h2>

          <div className="mb-6">
            <label className="block font-bold text-gray-800 mb-2">What surplus resources do you have? (Select all that apply)</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'agri-waste', label: 'Crop Residue / Straw' },
                { id: 'space', label: 'Unused Shed / Land' },
                { id: 'water', label: 'Surplus Water' },
                { id: 'capital', label: 'Investment Capital (>₹50k)' }
              ].map(r => (
                <label key={r.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedResources.includes(r.id) ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" className="mr-3" checked={selectedResources.includes(r.id)} onChange={(e) => {
                    if (e.target.checked) setSelectedResources([...selectedResources, r.id]);
                    else setSelectedResources(selectedResources.filter(x => x !== r.id));
                  }} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block font-bold text-gray-800 mb-2">What is your primary secondary skill or interest?</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500" value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}>
              <option value="">Select an area of interest...</option>
              <option value="processing">Food Processing (Oils, Jams, Pickles)</option>
              <option value="weaving">Handicrafts (Coir, Bamboo, Palm-leaf)</option>
              <option value="livestock">Animal Husbandry & Dairy</option>
              <option value="technical">Machinery Repair & Operation</option>
            </select>
          </div>

          <button onClick={handleGenerate} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-lg">
            Find Opportunities <ArrowRight />
          </button>
        </div>
      ) : (
        <div>
          <button onClick={() => setStep(1)} className="text-indigo-600 font-medium flex items-center gap-1 mb-4">
            &larr; Refine Audit
          </button>

          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Lightbulb className="text-amber-500" /> Recommended Opportunities</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map(idea => (
              <div key={idea.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{idea.category}</span>
                    <h3 className="text-lg font-bold text-indigo-950 mt-1">{idea.title}</h3>
                  </div>
                  <button disabled={savingIdea || savedIdeas.includes(idea.id)} onClick={() => void toggleSave(idea.id)} className={`p-2 rounded-full ${savedIdeas.includes(idea.id) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-indigo-600'}`}>
                    <Lightbulb size={18} className={savedIdeas.includes(idea.id) ? 'fill-current' : ''} />
                  </button>
                </div>

                <div className="p-4 flex-1">
                  <p className="text-gray-600 text-sm mb-4">{idea.description}</p>

                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 mb-4">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center gap-1"><Calculator size={14} /> Financial Projection (Monthly)</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="block text-gray-500 text-xs">Est. Investment</span>
                        <span className="font-bold text-gray-900 flex items-center"><IndianRupee size={12} /> {idea.investment.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 text-xs">Operating Cost</span>
                        <span className="font-bold text-red-600 flex items-center"><IndianRupee size={12} /> {idea.operatingCost.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-emerald-200 mt-1">
                        <span className="block text-emerald-800 text-xs font-bold">Expected Net Income</span>
                        <span className="font-bold text-emerald-600 text-lg flex items-center"><IndianRupee size={16} /> {idea.expectedIncome.toLocaleString()}</span>
                        <span className="text-xs text-emerald-600">ROI: ~{idea.roiMonths} months</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-800 uppercase mb-2 flex items-center gap-1"><BookOpen size={14} /> Getting Started</h4>
                    <ul className="text-sm text-gray-600 list-decimal pl-4 space-y-1">
                      {idea.steps.map(s => <li key={s}>{s}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase mb-2 flex items-center gap-1"><LinkIcon size={14} /> Training & Schemes</h4>
                    <div className="flex flex-wrap gap-2">
                      {idea.schemes.map(s => (
                        <span key={s} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2 py-1 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
