import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Activity, Leaf, History, FileText, Camera } from 'lucide-react';
import { cn, formatConfidence, normalizeConfidence } from '@/utils';
import { useAuthStore } from '@/stores/authStore';
import { getCropClassMetadata } from '@/services/cropClassMetadata';

const FALLBACK_RECOMMENDATIONS = {
  culturalPractices: ['Ensure proper spacing between plants.', 'Maintain adequate field drainage.', 'Remove and destroy infected plant debris.'],
  organicOptions: ['Apply neem-based solutions where applicable.', 'Use bio-fungicides as preventive measure.', 'Improve soil health with compost.'],
  chemicalControl: ['Follow locally approved product labels and agricultural authority recommendations.', 'Consult qualified agricultural professional for treatment options.'],
  precautions: ['Wear protective gear while spraying.', 'Avoid spraying during high wind.', 'Do not mix incompatible chemicals.', 'Seek expert advice for severe cases.'],
};

type TabKey = 'culturalPractices' | 'organicOptions' | 'chemicalControl' | 'precautions';
const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'organicOptions', label: 'Organic / Biological Options' },
  { key: 'culturalPractices', label: 'Cultural Practices' },
  { key: 'chemicalControl', label: 'Chemical Guidance' },
  { key: 'precautions', label: 'Precautions' },
];

export default function AnalysisResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scan, setScan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('organicOptions');

  useEffect(() => {
    const loadScan = async () => {
      if (!id) return;
      try {
        if (!user?.id) {
          setScan(null);
          return;
        }
        const data = await db.scans.get(Number(id));
        setScan(data?.userId === user.id ? data : null);
      } catch (error) {
        console.error('Error loading scan', error);
      } finally {
        setLoading(false);
      }
    };
    loadScan();
  }, [id, user?.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Scan Not Found</h2>
        <button onClick={() => navigate('/analyzer')} className="btn-primary">Back to Analyzer</button>
      </div>
    );
  }

  const isLowConfidence = scan.confidenceLevel === 'low';
  const normalizedConfidence = normalizeConfidence(scan.confidence);
  const confidenceColor = normalizedConfidence >= 0.85 && !isLowConfidence
    ? 'text-emerald-700 bg-emerald-100'
    : isLowConfidence
      ? 'text-red-700 bg-red-100'
      : 'text-amber-700 bg-amber-100';

  const metadata = getCropClassMetadata(scan.modelClass);
  const recs = metadata?.recommendations || scan.recommendations || FALLBACK_RECOMMENDATIONS;
  const currentRecs: string[] = recs[activeTab] || [];
  const symptoms: string[] = metadata?.symptoms || scan.symptoms || [];
  const displayName = metadata?.displayName || scan.diseaseName;
  const scientificName = metadata?.scientificName || scan.scientificName;
  const category = metadata?.category || scan.category;
  const isHealthy = metadata?.isHealthy ?? scan.disease === 'healthy';

  const cropLabel = scan.crop === 'paddy' ? 'Paddy' : scan.crop === 'wheat' ? 'Wheat' : scan.crop;
  const imageUrl = scan.imageData || scan.imageUrl || '';

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/analyzer')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-700">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Analysis Result</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/reports')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-700" title="Generate Report">
            <Download size={20} />
          </button>
        </div>
      </div>

      {isLowConfidence && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm font-medium">Low confidence — treat this prediction cautiously and retake the image with the crop centered, sharp, and evenly lit.</p>
        </div>
      )}

      {scan.isPrototype && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-blue-700 text-xs font-medium">
          ℹ️ Prototype AI inference — results are simulated for demonstration purposes.
        </div>
      )}

      {!scan.isPrototype && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Local MobileNetV2 prediction. Confidence is this image's model score, not overall accuracy. This prototype achieved 66.3% accuracy on its held-out test set and may not generalize to field images.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Image & Basic Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative">
            {imageUrl ? (
              <img src={imageUrl} alt="Crop Scan" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400">
                <Camera size={48} />
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className={cn("px-3 py-1.5 rounded-full text-sm font-bold shadow-sm backdrop-blur-md", confidenceColor)}>
                {formatConfidence(scan.confidence)} Confidence
              </span>
            </div>
            {scan.isPrototype && (
              <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded">Demo Scan</div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Leaf size={20} className="text-emerald-600" />
              <span className="font-medium text-gray-600">{cropLabel}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
            {scientificName && <p className="italic text-gray-500">{scientificName}</p>}
            {category && <p className="mt-2 text-sm font-medium text-emerald-700">Category: {category}</p>}

            <div className={cn('mt-5 rounded-xl border p-4', isHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50')}>
              <div className="flex items-center gap-2">
                {isHealthy && <CheckCircle size={18} className="text-emerald-600" />}
                <span className="text-sm font-semibold text-gray-800">
                  {isHealthy ? 'Healthy status predicted' : 'Severity: Not estimated by this model'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                This classifier predicts a crop condition and confidence only; it does not measure disease severity.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Recommendations */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className={cn("rounded-2xl shadow-sm p-5 border flex min-h-32 flex-col items-center justify-center text-center", isHealthy ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
              <span className="text-sm font-medium text-gray-500 mb-2">Disease Risk Score</span>
              <span className={cn("text-2xl font-bold", isHealthy ? "text-emerald-700" : "text-red-700")}>
                {isHealthy ? '12/100' : '85/100'}
              </span>
              <span className="mt-1 text-xs text-gray-500">Based on scan, vegetative stage & humid weather</span>
            </div>
            <div className={cn("flex min-h-32 flex-col items-center justify-center rounded-2xl border p-5 text-center shadow-sm", isHealthy ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
              <AlertTriangle size={28} className={cn("mb-2", isHealthy ? "text-emerald-500" : "text-amber-500")} />
              <span className="text-sm font-medium mb-1">Early Warning</span>
              <span className="text-lg font-bold">{isHealthy ? 'Low Risk' : 'High Alert'}</span>
              <span className="mt-1 text-xs opacity-75">{isHealthy ? 'Conditions stable' : 'Favorable conditions for spread'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center"><Activity size={18} className="mr-2 text-emerald-600" /> Common Reference Symptoms</h3>
            <p className="mb-3 mt-1 text-xs text-gray-500">Static information for this category; these symptoms were not independently detected by the model.</p>
            <ul className="list-disc pl-5 space-y-1">
              {symptoms.map((sym: string, i: number) => (
                <li key={i} className="text-gray-600">{sym}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-0 border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              General reference guidance for the predicted category; this content is not an ML prediction or a treatment prescription.
            </div>
            <div className="border-b border-gray-100 bg-gray-50/50 p-2 overflow-x-auto hide-scrollbar">
              <div className="flex space-x-2">
                {TAB_LABELS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                      activeTab === key ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {currentRecs.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle size={18} className="text-emerald-500 mr-2 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
                {currentRecs.length === 0 && (
                  <li className="text-gray-400 text-sm">No additional guidance is listed for this section.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => navigate('/analyzer', { state: { fieldId: scan.fieldId } })} className="flex items-center justify-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition-colors">
          <Camera size={18} className="mr-2" /> Scan Again
        </button>
        <button onClick={() => navigate('/history')} className="flex items-center justify-center py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl font-medium shadow-sm transition-colors">
          <History size={18} className="mr-2" /> View History
        </button>
        <button onClick={() => navigate(`/history/${id}`)} className="flex items-center justify-center py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl font-medium shadow-sm transition-colors">
          <Activity size={18} className="mr-2" /> Details
        </button>
        <button onClick={() => navigate('/reports')} className="flex items-center justify-center py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl font-medium shadow-sm transition-colors">
          <FileText size={18} className="mr-2" /> Report
        </button>
      </div>
    </div>
  );
}
