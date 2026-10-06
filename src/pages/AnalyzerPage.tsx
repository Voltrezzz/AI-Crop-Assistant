import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, Loader2, Upload, X } from 'lucide-react';
import { db } from '@/db/database';
import { classifyCropImage, CropModelError } from '@/ai/tfjsInference';
import { getCropClassMetadata } from '@/services/cropClassMetadata';
import { queueCloudChange } from '@/services/cloudSyncService';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils';
import type { CropType } from '@/types';

type Feedback = { type: 'error' | 'warning' | 'success'; message: string };

export default function AnalyzerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [selectedCrop, setSelectedCrop] = useState<CropType | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const requestedFieldId = Number(location.state?.fieldId);
    if (!user?.id || !Number.isSafeInteger(requestedFieldId)) return;
    void db.fields.get(requestedFieldId).then((field) => {
      if (field && field.userId === user.id) setSelectedCrop(field.crop);
    });
  }, [location.state, user?.id]);

  const handleImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please upload a valid image file.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size should be less than 10 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setFeedback({ type: 'success', message: 'Image loaded. Ready for on-device analysis.' });
    };
    reader.onerror = () => setFeedback({ type: 'error', message: 'The image could not be read.' });
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image || !selectedCrop || !user?.id) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      const prediction = await classifyCropImage(image, selectedCrop);
      const metadata = getCropClassMetadata(prediction.className);
      if (!metadata) throw new Error(`No metadata is configured for model class ${prediction.className}.`);
      const confidence = Math.round(prediction.confidence * 10000) / 10000;
      const requestedFieldId = Number(location.state?.fieldId);
      let fieldId: number | undefined;
        let locationLat: number | undefined;
        let locationLng: number | undefined;
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
          locationLat = pos.coords.latitude;
          locationLng = pos.coords.longitude;
        } catch { console.log('Location not available'); }
      if (Number.isSafeInteger(requestedFieldId)) {
        const requestedField = await db.fields.get(requestedFieldId);
        if (requestedField?.userId === user.id && requestedField.crop === selectedCrop) {
          fieldId = requestedFieldId;
        }
      }
      const id = await db.scans.add({
        userId: user.id,
        fieldId,
          locationLat,
          locationLng,
        crop: selectedCrop,
        disease: prediction.disease,
        diseaseName: metadata.displayName,
        modelClass: prediction.className,
        category: metadata.category,
        scientificName: metadata.scientificName || '',
        confidence,
        confidenceLevel: prediction.isLowConfidence ? 'low' : confidence >= 0.85 ? 'high' : 'moderate',
        severity: null,
        healthScore: null,
        risk: null,
        symptoms: metadata.symptoms,
        recommendations: metadata.recommendations,
        imageData: image,
        date: new Date().toISOString(),
        syncStatus: 'pending',
        isPrototype: false,
      } as any);
      const savedScan = await db.scans.get(id);
      if (savedScan) await queueCloudChange(user.id, 'scans', 'create', savedScan as unknown as Record<string, unknown>);
      navigate(`/analyzer/result/${id}`);
    } catch (error) {
      const message = error instanceof CropModelError
        ? error.message
        : 'Crop analysis failed. Check the installed model files and try again.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Scan Your Crop</h1>
        <p className="mt-2 text-gray-500">Select the crop and upload a clear leaf image for local model inference.</p>
        <p className="mt-1 text-xs text-gray-400">Supports 4 rice and 13 wheat classes. Prototype held-out test accuracy: 66.3%.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        {(['paddy', 'wheat'] as CropType[]).map((crop) => (
          <button
            key={crop}
            onClick={() => setSelectedCrop(crop)}
            className={cn(
              'rounded-xl border-2 bg-white p-6 text-lg font-semibold capitalize transition-all',
              selectedCrop === crop ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-200'
            )}
          >
            <span className="mb-2 block text-4xl">🌾</span>{crop}
          </button>
        ))}
      </div>

      <div className={cn('mb-6 rounded-2xl border bg-white p-6 shadow-sm', !selectedCrop && 'pointer-events-none opacity-50')}>
        {image ? (
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-gray-100">
            <img src={image} alt="Crop scan" className="max-h-full max-w-full object-contain" />
            <button onClick={() => { setImage(null); setFeedback(null); }} className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-gray-800">
              <X size={20} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleImage(event.dataTransfer.files[0]); }}
            className={cn('rounded-xl border-2 border-dashed p-10 text-center', isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300')}
          >
            <Upload className="mx-auto mb-3 text-emerald-600" size={36} />
            <p className="mb-4 text-gray-600">Drop a crop image here or choose an option</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Choose Image</button>
              <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700"><Camera size={16} /> Camera</button>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImage(event.target.files?.[0])} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleImage(event.target.files?.[0])} />
      </div>

      {feedback && (
        <div className={cn('mb-5 flex items-start gap-2 rounded-lg border p-3 text-sm', feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700')}>
          <AlertCircle className="mt-0.5 shrink-0" size={17} /> {feedback.message}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!image || !selectedCrop || isProcessing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
      >
        {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Analyzing locally...</> : 'Analyze Crop'}
      </button>
    </div>
  );
}
