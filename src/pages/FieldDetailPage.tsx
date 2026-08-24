import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Field, Scan } from '@/types';
import { cn, formatDate, formatHealthScore, formatRisk, formatSeverity, getRiskColor, getSeverityColor, getStatusColor, capitalize } from '@/utils';
import { ArrowLeft, Camera, Activity, Calendar, MapPin, Leaf, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function FieldDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [field, setField] = useState<Field | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFieldData(parseInt(id, 10));
    }
  }, [id, user?.id]);

  const loadFieldData = async (fieldId: number) => {
    setLoading(true);
    try {
      if (!user?.id) {
        setField(null);
        setScans([]);
        return;
      }
      const fieldData = await db.fields.get(fieldId);
      if (fieldData?.userId !== user.id) {
        setField(null);
        setScans([]);
        return;
      }
      if (fieldData) {
        setField(fieldData);
        const fieldScans = await db.scans.where('userId').equals(user.id).and((scan) => scan.fieldId === fieldId).toArray();
        fieldScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setScans(fieldScans);
      }
    } catch (error) {
      console.error('Failed to load field data', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  }

  if (!field) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Field not found</h2>
        <button onClick={() => navigate('/fields')} className="text-green-600 hover:underline">Return to fields list</button>
      </div>
    );
  }

  const latestScan = scans.length > 0 ? scans[0] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/fields')}
        className="flex items-center text-green-700 hover:text-green-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Fields
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Info Card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{field.name}</h1>
                <div className="flex flex-wrap gap-3">
                  <span className="flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    <Leaf className="w-4 h-4 mr-1.5 text-green-600" />
                    {capitalize(field.crop)} ({field.variety})
                  </span>
                  <span className="flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    <MapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                    {field.location}
                  </span>
                  <span className="flex items-center text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    <Activity className="w-4 h-4 mr-1.5 text-amber-600" />
                    {field.area} {field.areaUnit}
                  </span>
                </div>
              </div>
              <span className={cn("px-3 py-1 rounded-full text-sm font-semibold border", getStatusColor(field.status))}>
                {capitalize(field.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">Planting Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(field.plantingDate)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">Expected Harvest</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(field.expectedHarvest)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">Growth Stage</p>
                <p className="text-sm font-medium text-gray-900">{capitalize(field.growthStage)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">Disease Risk</p>
                <p className={cn("text-sm font-medium", getRiskColor(field.diseaseRisk))}>{capitalize(field.diseaseRisk)}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/analyzer', { state: { fieldId: field.id } })}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" /> New Scan
              </button>
              <button 
                onClick={() => navigate('/growth', { state: { fieldId: field.id } })}
                className="flex-1 bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Activity className="w-5 h-5" /> Growth Progress
              </button>
            </div>
          </div>
        </div>

        {/* Health Score Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 w-full text-left">Overall Health</h3>
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={field.healthScore >= 80 ? "text-green-500" : field.healthScore >= 60 ? "text-amber-500" : "text-red-500"}
                strokeDasharray={`${field.healthScore}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="text-center">
              <span className="text-4xl font-bold text-gray-900">{field.healthScore}</span>
              <span className="text-gray-500 text-sm block">/ 100</span>
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm">
            {field.healthScore >= 80 ? "Crop is in excellent condition." : 
             field.healthScore >= 60 ? "Crop needs some attention." : 
             "Critical action required."}
          </p>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Recent Scans</h3>
          <button 
            onClick={() => navigate('/history')}
            className="text-sm font-medium text-green-600 hover:text-green-800 flex items-center"
          >
            View All History <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        {scans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No scans recorded for this field yet.</p>
            <p className="text-sm mt-1">Run a scan to start tracking health history.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {scans.slice(0, 5).map((scan) => (
              <div 
                key={scan.id} 
                onClick={() => navigate(`/history/${scan.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                  {scan.thumbnailData ? (
                    <img src={scan.thumbnailData} alt={scan.diseaseName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-md font-semibold text-gray-900 truncate">{scan.diseaseName}</h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{formatDate(scan.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600">{formatHealthScore(scan.healthScore)} Health</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className={cn("font-medium", getSeverityColor(scan.severity))}>{formatSeverity(scan.severity)} Severity</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-gray-600">Risk: {formatRisk(scan.risk)}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
