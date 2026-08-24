import { RiskLevel } from '@/types';

interface RiskEngineInputs {
  crop: string;
  diseaseHistory: string[];
  humidity: number;
  temperature: number;
  rainfall: number;
  growthStage: string;
  currentDisease: string;
}

interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
  label: string;
}

export function assessRisk(inputs: RiskEngineInputs): RiskAssessment {
  let riskScore = 0;
  const reasons: string[] = [];

  if (inputs.currentDisease !== 'healthy') {
    riskScore += 40;
    reasons.push(`Active infection of ${inputs.currentDisease} detected.`);
  }

  if (inputs.humidity > 80) {
    riskScore += 20;
    reasons.push('High humidity creates favorable conditions for fungal growth.');
  }

  if (inputs.rainfall > 50) {
    riskScore += 15;
    reasons.push('Recent heavy rainfall increases disease spread risk.');
  }

  if (inputs.diseaseHistory.includes(inputs.currentDisease)) {
    riskScore += 15;
    reasons.push('Historical presence of the disease in the field.');
  }

  let level: RiskLevel = 'low';
  if (riskScore > 75) level = 'extreme';
  else if (riskScore > 50) level = 'high';
  else if (riskScore > 25) level = 'medium';

  return {
    level,
    reasons,
    label: 'Prototype Risk Assessment'
  };
}
