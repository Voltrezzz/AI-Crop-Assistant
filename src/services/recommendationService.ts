export interface RecommendationSet {
  cultural: string[];
  organic: string[];
  chemical: string[];
  precautions: string[];
}

export function getRecommendations(diseaseId: string, severity: string): RecommendationSet {
  const baseRecommendations: RecommendationSet = {
    cultural: [],
    organic: [],
    chemical: [],
    precautions: ['Always wear appropriate PPE when applying any treatments.', 'Follow locally approved product labels']
  };

  if (diseaseId === 'healthy') {
    return {
      cultural: ['Maintain balanced fertilization', 'Ensure proper spacing'],
      organic: ['Continue monitoring'],
      chemical: [],
      precautions: []
    };
  }

  // Example subset for prototype
  if (diseaseId.includes('rust')) {
    baseRecommendations.cultural.push('Destroy volunteer crops', 'Ensure adequate field drainage');
    baseRecommendations.organic.push('Apply neem oil or sulfur dust early');
    baseRecommendations.chemical.push('Use Triazole or Strobilurin based fungicides if severe. Follow locally approved product labels.');
  } else if (diseaseId.includes('blight')) {
    baseRecommendations.cultural.push('Avoid working in wet fields to prevent spread', 'Remove infected plant debris');
    baseRecommendations.organic.push('Use copper-based sprays');
    baseRecommendations.chemical.push('Apply appropriate bactericides/fungicides. Follow locally approved product labels.');
  } else {
    baseRecommendations.cultural.push('Improve air circulation', 'Optimize nitrogen application');
    baseRecommendations.chemical.push('Apply broad-spectrum fungicide as per local guidelines. Follow locally approved product labels.');
  }

  if (severity === 'high' || severity === 'severe') {
    baseRecommendations.precautions.push('Immediate action required to prevent significant yield loss.');
  }

  return baseRecommendations;
}
