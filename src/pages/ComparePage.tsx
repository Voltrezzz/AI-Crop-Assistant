import React, { useState } from 'react';
import { Search, Scale, Map, HeartPulse, Activity, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { getComparisonData } from '@/services/socialService';
import { ComparisonResult, Field } from '@/types';
import { useFieldStore } from '@/stores/fieldStore';

export default function ComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [remoteData, setRemoteData] = useState<ComparisonResult | null>(null);
  
  const myFields = useFieldStore(state => state.fields);
  const myPrimaryField = myFields[0]; // Just comparing the first field for simplicity

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await getComparisonData(query);
      setRemoteData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderComparisonRow = (label: string, myValue: any, remoteValue: any, icon: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100 dark:border-slate-700/50 items-center">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400">
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg text-center">
        {myValue || '-'}
      </div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
        {remoteValue || '-'}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <header className="px-4 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Scale className="text-primary-600" />
              Compare Farms
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Compare your farm with friends or neighbors</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter User ID or Contract ID (e.g. DEMO-123)"
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white transition-all"
          />
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Compare'}
          </button>
        </form>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!remoteData ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-4 text-primary-600">
              <Scale size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Compare & Learn</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Enter a friend's Contract ID to compare crop varieties, health scores, and farming practices.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="col-start-2 text-center font-bold text-gray-900 dark:text-white">You</div>
              <div className="col-start-3 text-center font-bold text-blue-600 dark:text-blue-400">{remoteData.userName}</div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Map size={18} className="text-primary-600" />
                Field & Crop Details
              </div>
              
              {renderComparisonRow('Crop Type', myPrimaryField?.crop, remoteData.fields[0]?.crop, <Activity size={16} />)}
              {renderComparisonRow('Variety', myPrimaryField?.variety, remoteData.fields[0]?.variety, <Activity size={16} />)}
              {renderComparisonRow('Area', `${myPrimaryField?.area || 0} ${myPrimaryField?.areaUnit || 'acres'}`, `${remoteData.fields[0]?.area || 0} ${remoteData.fields[0]?.areaUnit || 'acres'}`, <Map size={16} />)}
              {renderComparisonRow('Growth Stage', myPrimaryField?.growthStage, remoteData.fields[0]?.growthStage, <HeartPulse size={16} />)}
              
              <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-y border-gray-200 dark:border-slate-700 font-semibold text-gray-900 dark:text-white flex items-center gap-2 mt-4">
                <HeartPulse size={18} className="text-primary-600" />
                Health & Risk
              </div>

              {renderComparisonRow('Health Score', myPrimaryField?.healthScore, remoteData.fields[0]?.healthScore, <HeartPulse size={16} />)}
              {renderComparisonRow('Status', myPrimaryField?.status, remoteData.fields[0]?.status, <Activity size={16} />)}
              {renderComparisonRow('Disease Risk', myPrimaryField?.diseaseRisk, remoteData.fields[0]?.diseaseRisk, <ShieldAlert size={16} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
