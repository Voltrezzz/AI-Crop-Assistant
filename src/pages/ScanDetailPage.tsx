import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Scan, Field } from '@/types';
import { cn, formatConfidence, formatDate, formatDateTime, formatHealthScore, formatRisk, formatSeverity, getSeverityColor, capitalize } from '@/utils';
import { ArrowLeft, Droplets, Wind, Thermometer, AlertTriangle, ShieldCheck, FileText, Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scan, setScan] = useState<Scan | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [prevScan, setPrevScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cultural' | 'chemical' | 'organic'>('cultural');

  useEffect(() => {
    const loadScanDetails = async (scanId: number) => {
      try {
        if (!user?.id) {
          setScan(null);
          setField(null);
          setPrevScan(null);
          return;
        }
        const scanData = await db.scans.get(scanId);
        if (scanData?.userId !== user.id) {
          setScan(null);
          setField(null);
          setPrevScan(null);
          return;
        }
        if (scanData) {
          setScan(scanData);
          if (scanData.fieldId) {
            const fieldData = await db.fields.get(scanData.fieldId);
            setField(fieldData || null);

            // Find previous scan for comparison
            const allFieldScans = await db.scans.where('userId').equals(user.id).and((scan) => scan.fieldId === scanData.fieldId).toArray();
            allFieldScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const currentIndex = allFieldScans.findIndex(s => s.id === scanId);
            if (currentIndex !== -1 && currentIndex < allFieldScans.length - 1) {
              setPrevScan(allFieldScans[currentIndex + 1]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load scan details', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadScanDetails(parseInt(id, 10));
    }
  }, [id, user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
  }

  if (!scan) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Scan not found</h2>
        <button onClick={() => navigate('/history')} className="text-green-600 hover:underline">Return to history</button>
      </div>
    );
  }

  const isHealthy = scan.disease === 'healthy';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center text-green-700 hover:text-green-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" /> Back to History
        </button>
        <div className="text-sm text-gray-500">{formatDateTime(scan.date)}</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:w-2/5 bg-gray-100 relative">
            <img
              src={scan.imageData}
              alt={scan.diseaseName}
              className="w-full h-64 md:h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase">Health Score</p>
              <div className="flex items-end gap-2">
                <span className={cn("text-2xl font-bold", typeof scan.healthScore !== 'number' ? 'text-gray-600' : scan.healthScore >= 80 ? 'text-green-600' : scan.healthScore >= 60 ? 'text-amber-500' : 'text-red-600')}>
                  {formatHealthScore(scan.healthScore)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 md:w-3/5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{scan.diseaseName}</h1>
                {!isHealthy && <p className="text-sm italic text-gray-500">{scan.scientificName}</p>}
              </div>
              <span className={cn("px-3 py-1 rounded-full text-sm font-semibold", getSeverityColor(scan.severity))}>
                {formatSeverity(scan.severity)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold">Field</p>
                <p className="font-medium text-gray-900 truncate">{field ? field.name : 'Unknown'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold">Crop</p>
                <p className="font-medium text-gray-900">{capitalize(scan.crop)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold">Confidence</p>
                <p className="font-medium text-gray-900">{formatConfidence(scan.confidence)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold">Risk</p>
                <p className="font-medium text-gray-900">{formatRisk(scan.risk)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-semibold">Growth Stage</p>
                <p className="font-medium text-gray-900">{scan.growthStage ? capitalize(scan.growthStage) : 'N/A'}</p>
              </div>
            </div>

            {!isHealthy && scan.symptoms && scan.symptoms.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1 text-amber-500" /> Detected Symptoms
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {scan.symptoms.map((symptom, idx) => (
                    <li key={idx}>{symptom}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Section (if previous scan exists) */}
      {prevScan && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Trend Analysis</h2>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-sm text-gray-500 mb-1">{formatDate(prevScan.date)}</p>
              <p className="text-lg font-bold">{formatHealthScore(prevScan.healthScore)}</p>
              <p className={cn("text-xs font-medium", getSeverityColor(prevScan.severity))}>{formatSeverity(prevScan.severity)}</p>
            </div>
            <div className="flex-1 flex justify-center">
              {typeof scan.healthScore !== 'number' || typeof prevScan.healthScore !== 'number' ? (
                <div className="text-center text-xs font-medium text-gray-500">Trend not calculated</div>
              ) : scan.healthScore > prevScan.healthScore ? (
                <div className="flex flex-col items-center text-green-600">
                  <ArrowLeft className="w-8 h-8 transform rotate-135" />
                  <span className="text-sm font-bold mt-1">Improving</span>
                </div>
              ) : scan.healthScore < prevScan.healthScore ? (
                <div className="flex flex-col items-center text-red-600">
                  <ArrowLeft className="w-8 h-8 transform -rotate-45" />
                  <span className="text-sm font-bold mt-1">Worsening</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <ArrowLeft className="w-8 h-8 transform rotate-180" />
                  <span className="text-sm font-bold mt-1">Stable</span>
                </div>
              )}
            </div>
            <div className="text-center flex-1">
              <p className="text-sm text-gray-500 mb-1">{formatDate(scan.date)}</p>
              <p className="text-lg font-bold">{formatHealthScore(scan.healthScore)}</p>
              <p className={cn("text-xs font-medium", getSeverityColor(scan.severity))}>{formatSeverity(scan.severity)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {!isHealthy && scan.recommendations && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('cultural')}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors", activeTab === 'cultural' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}
            >
              Cultural Control
            </button>
            <button
              onClick={() => setActiveTab('chemical')}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors", activeTab === 'chemical' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}
            >
              Chemical Control
            </button>
            <button
              onClick={() => setActiveTab('organic')}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors", activeTab === 'organic' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50')}
            >
              Organic Options
            </button>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-green-600" />
              {activeTab === 'cultural' ? 'Cultural & Preventive Measures' : activeTab === 'chemical' ? 'Chemical Treatments' : 'Organic Solutions'}
            </h3>
            <ul className="space-y-3">
              {(activeTab === 'cultural' ? scan.recommendations.culturalPractices :
                activeTab === 'chemical' ? scan.recommendations.chemicalControl :
                scan.recommendations.organicOptions).map((rec, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>

            {scan.recommendations.precautions && scan.recommendations.precautions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" /> Precautions
                </h4>
                <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                  {scan.recommendations.precautions.map((pre, idx) => (
                    <li key={idx}>{pre}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weather Snapshot */}
      {scan.weatherSnapshot && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Weather conditions during scan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Temperature</p>
                <p className="font-semibold text-gray-900">{scan.weatherSnapshot.temperature}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="font-semibold text-gray-900">{scan.weatherSnapshot.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Rainfall</p>
                <p className="font-semibold text-gray-900">{scan.weatherSnapshot.rainfall}mm</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Wind className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Wind</p>
                <p className="font-semibold text-gray-900">{scan.weatherSnapshot.windSpeed} km/h</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/analyzer', { state: { fieldId: scan.fieldId } })}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" /> Scan Again
        </button>
        <button
          className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          onClick={() => alert('Report generation not implemented in prototype')}
        >
          <FileText className="w-5 h-5" /> Generate Report
        </button>
      </div>
    </div>
  );
}
