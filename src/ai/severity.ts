export type SeverityLevel = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export function calculateSeverity(infectedAreaRatio: number): SeverityLevel {
  if (infectedAreaRatio === 0) return 'none';
  if (infectedAreaRatio < 0.1) return 'low';
  if (infectedAreaRatio < 0.3) return 'moderate';
  if (infectedAreaRatio < 0.6) return 'high';
  return 'severe';
}

export function getSeverityScore(severity: SeverityLevel): number {
  switch (severity) {
    case 'none': return 0;
    case 'low': return 25;
    case 'moderate': return 50;
    case 'high': return 75;
    case 'severe': return 100;
    default: return 0;
  }
}

export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'none': return 'text-green-500';
    case 'low': return 'text-yellow-400';
    case 'moderate': return 'text-orange-500';
    case 'high': return 'text-red-500';
    case 'severe': return 'text-red-700';
    default: return 'text-gray-500';
  }
}

export function formatSeverity(severity: SeverityLevel): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}
