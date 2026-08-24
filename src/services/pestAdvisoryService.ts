import { z } from 'zod';
import type { PestAdvisory, PestCropSelection } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const adviceItem = z.string().trim().min(1).max(300);

export const pestAdvisorySchema = z.object({
  possibleIssue: z.string().trim().min(1).max(200),
  crop: z.enum(['Paddy/Rice', 'Wheat', 'Unknown']),
  confidence: z.enum(['low', 'moderate', 'high']),
  visibleSigns: z.array(adviceItem).max(10),
  possiblePests: z.array(adviceItem).max(8),
  recommendedActions: z.array(adviceItem).max(10),
  organicOptions: z.array(adviceItem).max(8),
  chemicalGuidance: z.array(adviceItem).max(8),
  precautions: z.array(adviceItem).max(10),
  needsExpertReview: z.boolean(),
  cropMismatch: z.boolean(),
  imageQuality: z.enum(['adequate', 'poor']),
  imageAssessment: z.enum(['suitable', 'poor_quality', 'unrelated', 'no_obvious_damage']),
  summary: z.string().trim().min(1).max(600),
}).strict();

export type PreparedPestImage = {
  data: string;
  dataUrl: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
};

const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PREPARED_IMAGE_BYTES = 4 * 1024 * 1024;

type PestAdvisoryErrorCode =
  | 'image'
  | 'offline'
  | 'auth'
  | 'rate_limit'
  | 'service'
  | 'response';

export class PestAdvisoryError extends Error {
  constructor(message: string, readonly code: PestAdvisoryErrorCode) {
    super(message);
    this.name = 'PestAdvisoryError';
  }
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PestAdvisoryError('The selected file could not be decoded as an image.', 'image'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new PestAdvisoryError('The image could not be prepared.', 'image')),
      'image/jpeg',
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new PestAdvisoryError('The prepared image could not be read.', 'image'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes and redraws the image, which removes EXIF metadata, constrains the
 * upload size, and preserves enough resolution for visual advisory analysis.
 */
export async function preparePestImage(file: File): Promise<PreparedPestImage> {
  if (!file.type.startsWith('image/')) {
    throw new PestAdvisoryError('Please select a valid image file.', 'image');
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new PestAdvisoryError('The image is too large. Please choose an image below 15 MB.', 'image');
  }

  const image = await readImage(file);
  if (image.naturalWidth < 128 || image.naturalHeight < 128) {
    throw new PestAdvisoryError('The image is too small. Use an image at least 128 × 128 pixels.', 'image');
  }

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new PestAdvisoryError('This browser cannot prepare images for analysis.', 'image');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasToJpeg(canvas, 0.84);
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) blob = await canvasToJpeg(canvas, 0.72);
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) {
    throw new PestAdvisoryError(
      'The prepared image is still too large. Crop closer or choose a smaller image.',
      'image',
    );
  }
  const dataUrl = await blobToDataUrl(blob);
  const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return { data, dataUrl, mimeType: 'image/jpeg', width, height };
}

const friendlyErrors: Record<Exclude<PestAdvisoryErrorCode, 'image'>, string> = {
  offline: 'AI pest image analysis requires an internet connection.',
  auth: 'Please sign in before using AI pest analysis.',
  rate_limit: 'AI analysis is temporarily busy. Please wait and try again.',
  service: 'AI pest analysis is temporarily unavailable.',
  response: 'We could not interpret the AI response. Please try another image.',
};

function errorFromServerCode(code: string, status?: number): PestAdvisoryError {
  if (code === 'auth_required' || code === 'invalid_session' || status === 401) {
    return new PestAdvisoryError(friendlyErrors.auth, 'auth');
  }
  if (code === 'rate_limited' || status === 429) {
    return new PestAdvisoryError(friendlyErrors.rate_limit, 'rate_limit');
  }
  if (code === 'invalid_image' || code === 'invalid_request' || status === 400 || status === 413) {
    return new PestAdvisoryError('Please upload a clear crop or leaf image.', 'image');
  }
  if (code === 'malformed_response') {
    return new PestAdvisoryError(friendlyErrors.response, 'response');
  }
  return new PestAdvisoryError(friendlyErrors.service, 'service');
}

async function mapInvocationError(error: unknown): Promise<PestAdvisoryError> {
  const candidate = error as { name?: unknown; message?: unknown; context?: unknown } | null;
  const response = typeof Response !== 'undefined' && candidate?.context instanceof Response
    ? candidate.context
    : null;
  let serverCode = '';

  if (response) {
    try {
      const payload = await response.clone().json() as { error?: { code?: unknown } };
      if (typeof payload.error?.code === 'string') serverCode = payload.error.code;
    } catch {
      // A non-JSON error body is mapped from the HTTP status below.
    }
  }

  if (import.meta.env.DEV) {
    console.error('[CropSense] Pest advisory request failed', {
      name: typeof candidate?.name === 'string' ? candidate.name : 'UnknownError',
      status: response?.status,
      serverCode: serverCode || undefined,
    });
  }
  return errorFromServerCode(serverCode, response?.status);
}

export async function requestPestAdvisory(
  image: PreparedPestImage,
  selectedCrop: PestCropSelection,
): Promise<PestAdvisory> {
  if (!navigator.onLine) {
    throw new PestAdvisoryError('AI pest image analysis requires an internet connection.', 'offline');
  }
  if (!isSupabaseConfigured()) {
    throw new PestAdvisoryError(friendlyErrors.service, 'service');
  }

  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    if (import.meta.env.DEV && sessionError) {
      console.error('[CropSense] Pest advisory session unavailable', { name: sessionError.name });
    }
    throw new PestAdvisoryError(friendlyErrors.auth, 'auth');
  }

  const { data, error } = await supabase.functions.invoke('pest-advisory', {
    body: {
      selectedCrop,
      image: { data: image.data, mimeType: image.mimeType },
    },
  });

  if (error) {
    throw await mapInvocationError(error);
  }
  if (data?.error) {
    const serverCode = typeof data.error === 'object' && typeof data.error.code === 'string'
      ? data.error.code
      : '';
    throw errorFromServerCode(serverCode);
  }

  const parsed = pestAdvisorySchema.safeParse(data?.advisory);
  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.error('[CropSense] Invalid pest advisory response', parsed.error.flatten());
    }
    throw new PestAdvisoryError(friendlyErrors.response, 'response');
  }
  return parsed.data;
}
