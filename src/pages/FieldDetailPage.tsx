import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Field, Scan, FarmActivity } from '@/types';
import { cn, formatDate, formatHealthScore, formatSeverity, getRiskColor, getSeverityColor, getStatusColor, capitalize } from '@/utils';
import { ArrowLeft, Camera, Activity, Calendar, MapPin, Leaf, Droplets, FlaskConical, Bug, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function FieldDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [field, setField] = useState<Field | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFieldData = async (fieldId: number) => {
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

          const fieldActivities = await db.farmActivities.where('userId').equals(user.id).and((act) => act.fieldId === fieldId).toArray();
          const cycles = await db.cropCycles.where('fieldId').equals(fieldId).filter(c => c.userId === user.id).toArray();
          setActiveCycle(cycles.find(c => c.status === 'active') || cycles.sort((a, b) => (b.id || 0) - (a.id || 0))[0] || null);
          setActivities(fieldActivities);
        }
      } catch (error) {
        console.error('Failed to load field data', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadFieldData(parseInt(id, 10));
    }
  }, [id, user?.id]);

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

  type TimelineEvent = { type: 'scan'; data: Scan; date: Date } | { type: 'activity'; data: FarmActivity; date: Date };
  const timeline: TimelineEvent[] = [
    ...scans.map((s): TimelineEvent => ({ type: 'scan', data: s, date: new Date(s.date) })),
    ...activities.map((a): TimelineEvent => ({ type: 'activity', data: a, date: new Date(a.date) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-3 mb-4">
        <button className="text-indigo-700" onClick={() => navigate(`/fields/${id}/satellite`)}>Satellite preview</button>
        {activeCycle?.id && <button className="text-green-700" onClick={() => navigate(`/harvest/${activeCycle.id}`)}>{activeCycle.status === 'active' ? 'Record harvest / sale' : 'View harvest / sale'}</button>}
      </div>
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

      {/* Crop Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Crop Timeline</h3>
          <button
            onClick={() => navigate('/add-activity', { state: { fieldId: field.id } })}
            className="text-sm font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center transition-colors"
          >
            + Add Activity
          </button>
        </div>

        {timeline.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No activity or scans recorded for this field yet.</p>
            <p className="text-sm mt-1">Add an activity or run a scan to build the timeline.</p>
          </div>
        ) : (
          <div className="p-6 relative">
            <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gray-200 z-0"></div>
            <div className="space-y-6 relative z-10">
              {timeline.map((event) => {
                if (event.type === 'scan') {
                  const scan = event.data as Scan;
                  return (
                    <div key={`scan-${scan.id}`} className="flex gap-4 cursor-pointer group" onClick={() => navigate(`/history/${scan.id}`)}>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-sm group-hover:bg-blue-200 transition-colors">
                        <Camera className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1 hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">Crop Scan: {scan.diseaseName}</h4>
                          <span className="text-xs font-medium text-gray-500">{formatDate(scan.date)}</span>
                        </div>
                        <div className="flex gap-3 text-sm text-gray-600">
                          <span className={cn("font-medium", getSeverityColor(scan.severity))}>{formatSeverity(scan.severity)}</span>
                          <span>•</span>
                          <span>Health Score: {formatHealthScore(scan.healthScore)}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const act = event.data as FarmActivity;
                  const getIcon = () => {
                    switch (act.type) {
                      case 'irrigation': return <Droplets className="w-4 h-4 text-cyan-600" />;
                      case 'fertilizer': return <FlaskConical className="w-4 h-4 text-purple-600" />;
                      case 'pesticide': return <Bug className="w-4 h-4 text-red-600" />;
                      case 'observation': return <Eye className="w-4 h-4 text-amber-600" />;
                      default: return <Leaf className="w-4 h-4 text-green-600" />;
                    }
                  };
                  const getBgColor = () => {
                    switch (act.type) {
                      case 'irrigation': return 'bg-cyan-100 group-hover:bg-cyan-200 border-white';
                      case 'fertilizer': return 'bg-purple-100 group-hover:bg-purple-200 border-white';
                      case 'pesticide': return 'bg-red-100 group-hover:bg-red-200 border-white';
                      case 'observation': return 'bg-amber-100 group-hover:bg-amber-200 border-white';
                      default: return 'bg-green-100 group-hover:bg-green-200 border-white';
                    }
                  };
                  return (
                    <div key={`act-${act.id}`} className="flex gap-4 group">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-4 shadow-sm transition-colors", getBgColor())}>
                        {getIcon()}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-gray-900">{act.title}</h4>
                          <span className="text-xs font-medium text-gray-500">{formatDate(act.date)}</span>
                        </div>
                        {act.description && <p className="text-sm text-gray-600 mt-1">{act.description}</p>}
                        {act.cost && <p className="text-xs font-medium text-gray-500 mt-2">Cost: ₹{act.cost}</p>}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
