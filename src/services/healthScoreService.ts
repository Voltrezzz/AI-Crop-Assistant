function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Combines disease, severity, and field risk into a 0–100 health score.
 * Labels match `SeverityLevel` / `RiskLevel` from the app types (lowercase).
 */
export function calculateHealthScore(disease: string, severity: string, riskLevel: string): number {
  let score = 100;
  const severityKey = normalizeLabel(severity);
  const riskKey = normalizeLabel(riskLevel);

  if (normalizeLabel(disease) !== 'healthy') {
    switch (severityKey) {
      case 'low': score -= 15; break;
      case 'moderate': score -= 30; break;
      case 'high': score -= 50; break;
      case 'severe':
      case 'critical': score -= 70; break;
    }
  }

  switch (riskKey) {
    case 'medium': score -= 5; break;
    case 'high': score -= 10; break;
    case 'extreme':
    case 'critical': score -= 15; break;
  }

  return Math.max(0, Math.min(100, score));
}
