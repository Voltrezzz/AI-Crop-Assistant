import * as tf from '@tensorflow/tfjs';
import type { CropType } from '@/types';

const MODEL_URL = `${import.meta.env.BASE_URL}models/crop-disease/tfjs/model.json`;
const CLASSES_URL = `${import.meta.env.BASE_URL}models/crop-disease/classes.json`;
const EXPECTED_CLASS_COUNT = 17;

// Prototype-only acceptance heuristics. These values are not scientifically validated.
// Confidence and margin are calculated after filtering to the selected crop and
// renormalizing that crop's probabilities to sum to 1.
const MIN_RETURNED_CONFIDENCE = 0.35;
const NORMAL_CONFIDENCE = 0.45;
const NORMAL_MARGIN = 0.05;
const EXTREME_AMBIGUITY_MARGIN = 0.02;
const MIN_PIXEL_STD_DEVIATION = 10;
const MIN_MEAN_BRIGHTNESS = 15;
const MAX_MEAN_BRIGHTNESS = 240;

let modelPromise: Promise<tf.LayersModel> | null = null;
let classesPromise: Promise<string[]> | null = null;

export class CropModelError extends Error {
  constructor(public code: 'model_unavailable' | 'uncertain' | 'crop_mismatch' | 'model_mismatch', message: string) {
    super(message);
  }
}

function loadImage(imageData: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new CropModelError('uncertain', 'The selected image could not be decoded.'));
    image.src = imageData;
  });
}

async function loadAssets(): Promise<[tf.LayersModel, string[]]> {
  modelPromise ??= tf.loadLayersModel(MODEL_URL).catch((error: unknown) => {
    modelPromise = null;
    console.error('Failed to load the local crop model:', error);
    const detail = error instanceof Error ? error.message : 'Unknown model-loading error.';
    throw new CropModelError('model_unavailable', `The local crop model could not be loaded: ${detail}`);
  });
  classesPromise ??= fetch(CLASSES_URL)
    .then((response) => {
      if (!response.ok) throw new Error('Class labels could not be loaded.');
      return response.json() as Promise<string[]>;
    })
    .catch((error) => {
      classesPromise = null;
      throw error;
    });

  const [model, classes] = await Promise.all([modelPromise, classesPromise]);
  const outputShape = model.outputs[0]?.shape;
  const outputCount = outputShape?.[outputShape.length - 1];
  if (
    classes.length !== EXPECTED_CLASS_COUNT
    || outputCount !== EXPECTED_CLASS_COUNT
    || classes.includes('Wheat_LeafBlight')
    || classes.includes('Wheat_Septoria')
  ) {
    throw new CropModelError('model_mismatch', 'The model output and generated 17-class mapping do not match.');
  }
  return [model, classes];
}

function friendlyLabel(className: string): string {
  return className.replace('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

export async function classifyCropImage(imageData: string, crop: CropType) {
  const [[model, classes], image] = await Promise.all([loadAssets(), loadImage(imageData)]);
  if (image.naturalWidth < 128 || image.naturalHeight < 128) {
    throw new CropModelError('uncertain', 'Please upload a clearer crop image at least 128 × 128 pixels.');
  }

  const prepared = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(image).toFloat();
    const moments = tf.moments(pixels);
    const mean = moments.mean.dataSync()[0];
    const standardDeviation = Math.sqrt(moments.variance.dataSync()[0]);
    // The exported model contains MobileNetV2 Rescaling (x / 127.5 - 1),
    // so browser input remains RGB float pixels in the original [0, 255] range.
    const resized = tf.image.resizeBilinear(pixels, [224, 224]);
    // Average the original and horizontally mirrored views. Horizontal flips
    // were used during training, so this reduces orientation-sensitive guesses
    // without introducing a transform the model has never seen.
    const input = tf.stack([resized, tf.reverse(resized, 1)]);
    return { input, mean, standardDeviation };
  });

  if (
    prepared.mean < MIN_MEAN_BRIGHTNESS
    || prepared.mean > MAX_MEAN_BRIGHTNESS
    || prepared.standardDeviation < MIN_PIXEL_STD_DEVIATION
  ) {
    prepared.input.dispose();
    throw new CropModelError('uncertain', 'Unable to confidently identify a supported crop condition. Please upload a clear rice or wheat crop/leaf image.');
  }

  const outputValue = model.predict(prepared.input);
  const output = Array.isArray(outputValue) ? outputValue[0] : outputValue;
  const viewProbabilities = Array.from(await output.data(), Number);
  prepared.input.dispose();
  output.dispose();

  if (
    viewProbabilities.length !== classes.length * 2
    || viewProbabilities.some((value) => !Number.isFinite(value))
  ) {
    throw new CropModelError('model_mismatch', 'The browser model returned an invalid class-probability vector.');
  }

  const probabilities = classes.map((_, index) => (
    viewProbabilities[index] + viewProbabilities[index + classes.length]
  ) / 2);

  const expectedPrefix = crop === 'paddy' ? 'Rice_' : 'Wheat_';
  const cropProbabilities = probabilities
    .map((confidence, index) => ({ confidence, className: classes[index] }))
    .filter(({ className }) => className.startsWith(expectedPrefix));
  const cropProbabilityTotal = cropProbabilities.reduce((sum, item) => sum + item.confidence, 0);
  if (cropProbabilities.length === 0 || !Number.isFinite(cropProbabilityTotal) || cropProbabilityTotal <= 0) {
    throw new CropModelError('model_mismatch', `The model has no valid classes for the selected ${crop} crop.`);
  }

  const ranked = cropProbabilities
    .map(({ confidence, className }) => ({ confidence: confidence / cropProbabilityTotal, className }))
    .sort((a, b) => b.confidence - a.confidence);
  const [best, second] = ranked;
  const margin = best ? best.confidence - (second?.confidence ?? 0) : 0;
  const isExtremelyAmbiguous = margin < EXTREME_AMBIGUITY_MARGIN;
  const isNormalConfidence = Boolean(best && best.confidence >= NORMAL_CONFIDENCE && margin >= NORMAL_MARGIN);

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[CropSense] ${crop} crop-specific model probabilities`);
    console.table(ranked.slice(0, 3).map(({ className, confidence }) => ({
      className,
      probability: `${(confidence * 100).toFixed(2)}%`,
    })));
    console.info('Prototype heuristic decision', {
      inference: 'mean of original and horizontal-flip predictions',
      confidence: best ? `${(best.confidence * 100).toFixed(2)}%` : 'unavailable',
      topTwoMargin: `${(margin * 100).toFixed(2)}%`,
      decision: !best || best.confidence < MIN_RETURNED_CONFIDENCE || isExtremelyAmbiguous
        ? 'reject'
        : isNormalConfidence ? 'accept' : 'accept-low-confidence',
      thresholds: {
        minimumConfidence: '35%',
        normalConfidence: '45%',
        normalMargin: '5%',
        extremeAmbiguityMargin: '2%',
      },
    });
    console.groupEnd();
  }

  if (!best || best.confidence < MIN_RETURNED_CONFIDENCE || isExtremelyAmbiguous) {
    throw new CropModelError('uncertain', 'Unable to confidently identify a supported crop condition. Please upload a clear rice or wheat crop/leaf image.');
  }

  const disease = best.className
    .replace(expectedPrefix, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
  return {
    className: best.className,
    disease,
    diseaseName: friendlyLabel(best.className),
    confidence: best.confidence,
    isLowConfidence: !isNormalConfidence,
  };
}
