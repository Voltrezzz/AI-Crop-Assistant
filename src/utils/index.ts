import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getConfidenceLevel(confidence: number): 'high' | 'moderate' | 'low' {
  const normalized = normalizeConfidence(confidence);
  if (normalized >= 0.85) return 'high';
  if (normalized >= 0.7) return 'moderate';
  return 'low';
}

/** Normalizes current and legacy scan confidence to the internal 0–1 range. */
export function normalizeConfidence(confidence: unknown): number {
  const value = typeof confidence === 'number' ? confidence : Number(confidence);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value > 1 ? value / 100 : value, 1);
}

export function formatConfidence(confidence: unknown): string {
  return `${(normalizeConfidence(confidence) * 100).toFixed(1)}%`;
}

export function formatSeverity(severity: string | null | undefined): string {
  return severity ? capitalize(severity) : 'Not estimated';
}

export function formatHealthScore(healthScore: number | null | undefined): string {
  return typeof healthScore === 'number' && Number.isFinite(healthScore)
    ? `${Math.round(healthScore)}/100`
    : 'Not calculated';
}

export function formatRisk(risk: string | null | undefined): string {
  return risk ? capitalize(risk) : 'Not assessed';
}

export function getConfidenceColor(level: string): string {
  switch (level) {
    case 'high': return 'text-green-600 bg-green-50 border-green-200';
    case 'moderate': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getSeverityColor(severity: string | null | undefined): string {
  switch (severity) {
    case 'low': return 'text-green-700 bg-green-100';
    case 'moderate': return 'text-amber-700 bg-amber-100';
    case 'high': return 'text-red-600 bg-red-100';
    case 'critical': return 'text-red-900 bg-red-200';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function getRiskColor(risk: string | null | undefined): string {
  switch (risk) {
    case 'low': return 'text-green-700 bg-green-100';
    case 'medium': return 'text-amber-700 bg-amber-100';
    case 'high': return 'text-red-600 bg-red-100';
    case 'extreme': return 'text-red-900 bg-red-200';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-green-700 bg-green-100';
    case 'attention': return 'text-amber-700 bg-amber-100';
    case 'critical': return 'text-red-700 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function compressImage(dataUrl: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export function createThumbnail(dataUrl: string, size: number = 150): Promise<string> {
  return compressImage(dataUrl, size, 0.6);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function diseaseLabelToKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_');
}

export function daysFromNow(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
