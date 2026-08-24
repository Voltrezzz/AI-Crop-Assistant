export function getConfidenceLevel(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.90) return 'High';
  if (confidence >= 0.70) return 'Medium';
  return 'Low';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.90) return 'text-green-600';
  if (confidence >= 0.70) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}
