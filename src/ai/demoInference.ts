import { CropType } from '@/types';



export interface CropAIModel {
  load(): Promise<void>;
  predict(imageData: string, crop: CropType, scenario?: string): Promise<any>;
}

export class DemoCropAIModel implements CropAIModel {
  async load(): Promise<void> {
    // Simulate model loading
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  // Deterministic hash function for string
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  async predict(imageData: string, crop: CropType, scenario?: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency

    let selectedScenario = scenario;
    if (!selectedScenario) {
      const hash = this.hashString(imageData);
      if (crop === 'paddy') {
        const scenarios = ['paddy_healthy', 'paddy_brown_spot', 'paddy_leaf_blast', 'paddy_bacterial_leaf_blight'];
        selectedScenario = scenarios[hash % scenarios.length];
      } else {
        const scenarios = ['wheat_healthy', 'wheat_leaf_rust', 'wheat_stripe_rust', 'wheat_powdery_mildew'];
        selectedScenario = scenarios[hash % scenarios.length];
      }
    }

    const basePrediction = {
      isPrototype: true,
      timestamp: new Date().toISOString(),
    };

    const generateConfidence = (scenarioStr: string) => {
      const hash = this.hashString(scenarioStr + imageData.length);
      // Generate confidence between 78 and 96
      return 0.78 + ((hash % 19) / 100);
    };

    const confidence = generateConfidence(selectedScenario);

    switch (selectedScenario) {
      case 'paddy_healthy':
        return {
          ...basePrediction,
          disease: 'healthy',
          confidence: generateConfidence('paddy_healthy'),
          severity: 'none',
          symptoms: [],
        };
      case 'paddy_brown_spot':
        return {
          ...basePrediction,
          disease: 'brown_spot',
          confidence,
          severity: 'moderate',
          symptoms: ['Small oval spots', 'Brown margins'],
        };
      case 'paddy_leaf_blast':
        return {
          ...basePrediction,
          disease: 'leaf_blast',
          confidence,
          severity: 'high',
          symptoms: ['Diamond shaped lesions', 'Grey center with brown margin'],
        };
      case 'paddy_bacterial_leaf_blight':
        return {
          ...basePrediction,
          disease: 'bacterial_leaf_blight',
          confidence,
          severity: 'high',
          symptoms: ['Yellowish stripes', 'Wavy margins'],
        };
      case 'wheat_healthy':
        return {
          ...basePrediction,
          disease: 'healthy',
          confidence: generateConfidence('wheat_healthy'),
          severity: 'none',
          symptoms: [],
        };
      case 'wheat_leaf_rust':
        return {
          ...basePrediction,
          disease: 'leaf_rust',
          confidence,
          severity: 'moderate',
          symptoms: ['Orange-brown pustules', 'Mainly on upper leaf surface'],
        };
      case 'wheat_stripe_rust':
        return {
          ...basePrediction,
          disease: 'stripe_rust',
          confidence,
          severity: 'high',
          symptoms: ['Yellow pustules in stripes', 'Affects leaves and heads'],
        };
      case 'wheat_powdery_mildew':
        return {
          ...basePrediction,
          disease: 'powdery_mildew',
          confidence,
          severity: 'moderate',
          symptoms: ['White powdery patches', 'Yellowing of lower leaves'],
        };
      default:
        return {
          ...basePrediction,
          disease: 'unknown',
          confidence: 0.5,
          severity: 'unknown',
          symptoms: [],
        };
    }
  }
}
