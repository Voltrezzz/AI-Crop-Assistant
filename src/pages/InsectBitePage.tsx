import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Bug, Camera, CheckCircle2, ChevronRight, Clock, History,
  Leaf, Loader2, RefreshCw, ShieldCheck, Upload, WifiOff, X,
} from 'lucide-react';
import { db } from '@/db/database';
import { useAuthStore } from '@/stores/authStore';
import type { PestAdvisory, PestAdvisoryRecord, PestCropSelection } from '@/types';
import {
  PestAdvisoryError,
  preparePestImage,
  requestPestAdvisory,
  type PreparedPestImage,
} from '@/services/pestAdvisoryService';
import { capitalize, cn, formatDateTime } from '@/utils';

const confidenceStyles: Record<PestAdvisory['confidence'], string> = {
  low: 'border-amber-200 bg-amber-100 text-amber-800',
  moderate: 'border-blue-200 bg-blue-100 text-blue-800',
  high: 'border-green-200 bg-green-100 text-green-800',
};

function isRejectedAssessment(result: PestAdvisory) {
  return result.imageAssessment === 'unrelated' || result.imageAssessment === 'poor_quality';
}

function AdviceList({ title, items, tone = 'neutral' }: {
  title: string;
  items: string[];
  tone?: 'neutral' | 'organic' | 'chemical' | 'precaution';
}) {
  if (!items.length) return null;
  const styles = {
    neutral: 'border-gray-200 bg-white',
    organic: 'border-green-200 bg-green-50',
    chemical: 'border-blue-200 bg-blue-50',
    precaution: 'border-amber-200 bg-amber-50',
  };
  return (
    <section className={cn('rounded-xl border p-4', styles[tone])}>
      <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function InsectBitePage() {
  const { user } = useAuthStore();
  const [selectedCrop, setSelectedCrop] = useState<PestCropSelection>('unspecified');
  const [preparedImage, setPreparedImage] = useState<PreparedPestImage | null>(null);
  const [result, setResult] = useState<PestAdvisory | null>(null);
  const [history, setHistory] = useState<PestAdvisoryRecord[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) {
        setHistory([]);
        return;
      }
      const records = await db.pestAdvisories.where('userId').equals(user.id).toArray();
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(records);
    };
    void loadHistory();
  }, [user?.id]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setIsPreparing(true);
    try {
      setPreparedImage(await preparePestImage(file));
    } catch (cause) {
      setPreparedImage(null);
      if (import.meta.env.DEV && !(cause instanceof PestAdvisoryError)) {
        console.error('[CropSense] Unexpected image preparation failure', {
          name: cause instanceof Error ? cause.name : 'UnknownError',
        });
      }
      setError(cause instanceof PestAdvisoryError
        ? cause.message
        : 'The image could not be prepared. Please choose another image.');
    } finally {
      setIsPreparing(false);
    }
  };

  const analyze = async () => {
    if (!preparedImage || !user?.id || processingRef.current) return;
    if (!online) {
      setError('AI pest image analysis requires an internet connection. Crop disease analysis with the local MobileNetV2 model remains available offline.');
      return;
    }
    if (user.isDemo) {
      setError('Gemini pest analysis requires a signed-in Supabase account. Demo mode remains local-only.');
      return;
    }

    setError(null);
    setResult(null);
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const advisory = await requestPestAdvisory(preparedImage, selectedCrop);
      setResult(advisory);
      if (!isRejectedAssessment(advisory)) {
        const record: PestAdvisoryRecord = {
          ...advisory,
          userId: user.id,
          selectedCrop,
          imageData: preparedImage.dataUrl,
          date: new Date().toISOString(),
          source: 'gemini',
        };
        try {
          record.id = await db.pestAdvisories.add(record);
          setHistory(current => [record, ...current]);
        } catch (storageError) {
          if (import.meta.env.DEV) {
            console.error('[CropSense] Pest advisory history save failed', {
              name: storageError instanceof Error ? storageError.name : 'UnknownError',
            });
          }
        }
      }
    } catch (cause) {
      if (import.meta.env.DEV && !(cause instanceof PestAdvisoryError)) {
        console.error('[CropSense] Unexpected pest advisory failure', {
          name: cause instanceof Error ? cause.name : 'UnknownError',
        });
      }
      setError(cause instanceof PestAdvisoryError
        ? cause.message
        : 'AI pest analysis is temporarily unavailable.');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const resetImage = () => {
    setPreparedImage(null);
    setResult(null);
    setError(null);
  };

  const openHistoryRecord = (record: PestAdvisoryRecord) => {
    const separator = record.imageData.indexOf(',');
    setPreparedImage({
      dataUrl: record.imageData,
      data: separator >= 0 ? record.imageData.slice(separator + 1) : '',
      mimeType: 'image/jpeg',
      width: 0,
      height: 0,
    });
    setSelectedCrop(record.selectedCrop);
    setResult(record);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-100 p-3 text-green-700"><Bug className="h-7 w-7" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Pest Damage Assistant</h1>
            <p className="text-sm text-gray-600">Gemini-powered visual guidance for possible rice and wheat pest damage.</p>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>AI-assisted visual advisory.</strong> This is not a confirmed diagnosis or a dedicated trained pest detector. Verify important decisions with a local agricultural expert.
      </div>

      {!online && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
          <span>AI pest image analysis requires an internet connection. Crop disease analysis with the local MobileNetV2 model remains available offline.</span>
        </div>
      )}
      {user?.isDemo && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>This online advisory requires a signed-in Supabase account. Demo mode does not send images to Gemini.</span>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900">Optional crop selection</h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            ['unspecified', 'Not selected'],
            ['paddy', 'Paddy / Rice'],
            ['wheat', 'Wheat'],
          ] as Array<[PestCropSelection, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedCrop(value)}
              className={cn(
                'rounded-xl border px-3 py-3 text-sm font-medium transition',
                selectedCrop === value
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Crop damage image</h2>
          {preparedImage ? (
            <div className="relative overflow-hidden rounded-xl border bg-gray-100">
              <img src={preparedImage.dataUrl} alt="Selected crop damage" className="aspect-square w-full object-contain" />
              <button
                type="button"
                onClick={resetImage}
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-gray-700"
                aria-label="Remove image"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
              {isPreparing ? (
                <><Loader2 className="mb-3 h-9 w-9 animate-spin text-green-600" /><p>Preparing image securely…</p></>
              ) : (
                <>
                  <Leaf className="mb-3 h-10 w-10 text-green-600" />
                  <p className="font-medium text-gray-800">Use a clear, close image of crop damage</p>
                  <p className="mt-1 text-xs text-gray-500">Show the affected leaf and any visible insects, larvae, webbing, holes, or clusters.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={() => uploadRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                      <Upload className="h-4 w-4" /> Upload
                    </button>
                    <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700">
                      <Camera className="h-4 w-4" /> Camera
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={event => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />

          <button
            type="button"
            onClick={analyze}
            disabled={!preparedImage || !online || user?.isDemo || isPreparing || isProcessing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isProcessing ? <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing visible damage…</> : <><ShieldCheck className="h-5 w-5" /> Get visual advisory</>}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">The prepared upload is resized and redrawn as JPEG, removing original EXIF metadata.</p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Visual advisory</h2>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span>{error}</span></div>
              {preparedImage && online && !user?.isDemo && <button type="button" onClick={analyze} className="mt-3 flex items-center gap-2 font-semibold text-red-700"><RefreshCw className="h-4 w-4" /> Retry</button>}
            </div>
          )}

          {!result && !error && !isProcessing && (
            <div className="flex min-h-72 flex-col items-center justify-center text-center text-gray-500">
              <Bug className="mb-3 h-12 w-12 text-gray-300" />
              <p>Upload a crop image and request an online advisory.</p>
              <p className="mt-1 text-xs">No random or sample prediction is used.</p>
            </div>
          )}

          {isProcessing && (
            <div className="flex min-h-72 flex-col items-center justify-center text-gray-600">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-green-600" />
              <p>Gemini is reviewing visible evidence…</p>
            </div>
          )}

          {result && !isProcessing && (
            isRejectedAssessment(result) ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {result.imageAssessment === 'unrelated'
                          ? 'This image is not suitable for crop pest-damage analysis.'
                          : 'This image is too unclear for a visual advisory.'}
                      </p>
                      <p className="mt-1">
                        {result.imageAssessment === 'unrelated'
                          ? 'Upload a close photo of a Paddy/Rice or Wheat plant, affected leaf, or visible pest damage.'
                          : 'Retake the crop image in focus, in good light, and close enough to show the affected area.'}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">{result.summary}</p>
                <button type="button" onClick={resetImage} className="flex items-center gap-2 font-semibold text-green-700">
                  <RefreshCw className="h-4 w-4" /> Choose another image
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {result.cropMismatch && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                    <p>The visible crop may not match your selected crop. The selection was not forced into the advisory.</p>
                    <button type="button" onClick={resetImage} className="mt-2 font-semibold text-orange-800">Choose another image</button>
                  </div>
                )}
                {result.needsExpertReview && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>Expert review is recommended because the damage is serious, uncertain, unusual, or insufficiently visible.</span>
                  </div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Possible issue</p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900">{result.possibleIssue}</h2>
                    <p className="mt-1 text-sm text-gray-600">Crop: {result.crop}</p>
                  </div>
                  <span className={cn('rounded-full border px-3 py-1 text-sm font-semibold', confidenceStyles[result.confidence])}>
                    {capitalize(result.confidence)} confidence
                  </span>
                </div>
                <p className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">{result.summary}</p>

                <AdviceList title="Visible signs" items={result.visibleSigns} />
                <AdviceList title="Possible pests" items={result.possiblePests} />
                <AdviceList title="Recommended actions" items={result.recommendedActions} />
                <AdviceList title="Organic / lower-risk options" items={result.organicOptions} tone="organic" />
                <AdviceList title="Cautious chemical guidance" items={result.chemicalGuidance} tone="chemical" />
                <AdviceList title="Precautions" items={result.precautions} tone="precaution" />

                {result.imageAssessment === 'no_obvious_damage' && (
                  <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>No obvious pest damage was visually identified in this image. Continue routine monitoring.</span>
                  </div>
                )}
              </div>
            )
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-green-700" />
          <h2 className="font-semibold text-gray-900">Pest advisory history</h2>
        </div>
        {history.length ? (
          <div className="divide-y divide-gray-100">
            {history.slice(0, 10).map(record => (
              <button
                key={record.id}
                type="button"
                onClick={() => openHistoryRecord(record)}
                className="flex w-full items-center gap-3 py-3 text-left hover:bg-gray-50"
              >
                <img src={record.imageData} alt="" className="h-12 w-12 rounded-lg border object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{record.possibleIssue}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {formatDateTime(record.date)}</p>
                </div>
                <span className={cn('rounded-full border px-2 py-1 text-xs font-medium', confidenceStyles[record.confidence])}>{capitalize(record.confidence)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">No Gemini pest advisories saved for this user yet.</p>
        )}
      </section>
    </div>
  );
}
