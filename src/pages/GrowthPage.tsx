import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Field, CropType, GrowthStage, GrowthRecord } from '@/types';
import { cn, formatDate, capitalize } from '@/utils';
import { Check, Clock, AlertCircle, Calendar, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const PADDY_STAGES: GrowthStage[] = ['nursery', 'vegetative', 'tillering', 'panicle_initiation', 'flowering', 'grain_filling', 'maturity'];
const WHEAT_STAGES: GrowthStage[] = ['germination', 'tillering', 'stem_extension', 'booting', 'heading', 'flowering', 'grain_filling', 'maturity'];

export default function GrowthPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const initialFieldId = location.state?.fieldId;

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | ''>(initialFieldId || '');
  const [field, setField] = useState<Field | null>(null);
  const [history, setHistory] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, [user?.id]);

  useEffect(() => {
    if (selectedFieldId) {
      loadFieldData(Number(selectedFieldId));
    } else {
      setField(null);
      setHistory([]);
    }
  }, [selectedFieldId]);

  const loadFields = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setFields([]);
        setSelectedFieldId('');
        return;
      }
      const allFields = await db.fields.where('userId').equals(user.id).toArray();
      setFields(allFields);
      if (!selectedFieldId && allFields.length > 0) {
        setSelectedFieldId(allFields[0].id!);
      }
    } catch (error) {
      console.error('Failed to load fields', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFieldData = async (fieldId: number) => {
    try {
      if (!user?.id) return;
      const fieldData = await db.fields.get(fieldId);
      if (fieldData?.userId === user.id) {
        setField(fieldData);
        const records = await db.growthRecords.where('userId').equals(user.id).and((record) => record.fieldId === fieldId).toArray();
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(records);
      } else {
        setField(null);
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to load field data', error);
    }
  };

  if (loading && fields.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  }

  const getStages = (crop: CropType) => crop === 'paddy' ? PADDY_STAGES : WHEAT_STAGES;
  const stages = field ? getStages(field.crop) : [];
  const currentStageIndex = field ? stages.indexOf(field.growthStage) : -1;
  const progressPercentage = field ? Math.max(5, (currentStageIndex / (stages.length - 1)) * 100) : 0;

  const daysSincePlanting = field ? Math.floor((new Date().getTime() - new Date(field.plantingDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Growth Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">Track crop development and receive stage-specific advice</p>
        </div>
        
        <div className="w-full sm:w-64">
          <select
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
          >
            <option value="" disabled>Select a field</option>
            {fields.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({capitalize(f.crop)})</option>
            ))}
          </select>
        </div>
      </div>

      {!field ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No crop data yet</h3>
          <p className="text-gray-500">Add a field to start tracking crop growth.</p>
        </div>
      ) : (
        <>
          {/* Progress Overview Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center md:text-left">
                <p className="text-sm text-gray-500 font-medium">Current Stage</p>
                <p className="text-2xl font-bold text-green-700">{capitalize(field.growthStage.replace(/_/g, ' '))}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Timeline</p>
                <p className="text-2xl font-bold text-gray-900">Day {Math.max(0, daysSincePlanting)}</p>
                <p className="text-xs text-gray-500">Planted {formatDate(field.plantingDate)}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm text-gray-500 font-medium">Estimated Harvest</p>
                <p className="text-2xl font-bold text-gray-900">{formatDate(field.expectedHarvest)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative pt-8 pb-4">
              <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-100">
                <div style={{ width: `${progressPercentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-1000"></div>
              </div>
              
              <div className="relative flex justify-between w-full">
                {stages.map((stage, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  const isFuture = idx > currentStageIndex;
                  
                  return (
                    <div key={stage} className="flex flex-col items-center group relative -mt-10">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border-2 mb-2 z-10",
                        isPast ? "bg-green-500 border-green-500 text-white" : 
                        isCurrent ? "bg-white border-green-500 text-green-500 shadow-sm" : 
                        "bg-white border-gray-200 text-gray-300"
                      )}>
                        {isPast ? <Check className="w-3 h-3" /> : 
                         isCurrent ? <div className="w-2 h-2 rounded-full bg-green-500" /> : 
                         <span className="text-[10px]">{idx + 1}</span>}
                      </div>
                      
                      {/* Only show text on larger screens or current stage on mobile */}
                      <span className={cn(
                        "text-[10px] md:text-xs font-medium text-center max-w-[60px] md:max-w-[80px]",
                        isCurrent ? "text-green-700" : isPast ? "text-gray-600" : "text-gray-400 hidden md:block"
                      )}>
                        {capitalize(stage.replace(/_/g, ' '))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Stage Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 rounded-xl border border-green-100 p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> Action Items
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-green-800 text-sm">Monitor soil moisture closely during this stage.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-green-800 text-sm">Apply recommended fertilizers if not done yet.</span>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-green-800 text-sm">Scout for early signs of common pests.</span>
                </li>
              </ul>
              <button className="mt-6 w-full bg-white text-green-700 border border-green-200 hover:bg-green-100 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center">
                <Plus className="w-4 h-4 mr-1" /> Log Growth Note
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-gray-500" /> Upcoming Stage
                </h3>
              </div>
              <div className="p-6">
                {currentStageIndex < stages.length - 1 ? (
                  <>
                    <p className="text-sm text-gray-500 mb-1">Next milestone</p>
                    <p className="text-xl font-bold text-gray-900 mb-2">
                      {capitalize(stages[currentStageIndex + 1].replace(/_/g, ' '))}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expected in approximately 7-14 days depending on weather conditions.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-900">Crop Matured</p>
                    <p className="text-sm text-gray-500">Ready for harvest</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
