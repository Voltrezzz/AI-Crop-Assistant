import { CropType, Prediction } from '@/types';
import { loadModel, getActiveModel } from './modelLoader';
import { checkImageQuality } from './imagePreprocessor';
import { getDiseaseInfo } from '../services/diseaseDatabase';
import { assessRisk } from '../services/riskEngine';
import { calculateHealthScore } from '../services/healthScoreService';
import { getRecommendations } from '../services/recommendationService';

export async function initAIService() {
  await loadModel(false);
}

export async function analyzeImage(imageData: string, crop: CropType, demoScenario?: string): Promise<any> {
  const model = getActiveModel();
  
  const quality = await checkImageQuality(imageData);
  
  const rawPrediction = await model.predict(imageData, crop, demoScenario);
  
  const diseaseInfo = getDiseaseInfo(rawPrediction.disease);
  
  const riskAssessment = assessRisk({
    crop,
    diseaseHistory: [], // mock history
    humidity: 85, // mock weather
    temperature: 24,
    rainfall: 10,
    growthStage: 'vegetative',
    currentDisease: rawPrediction.disease
  });
  
  const healthScore = calculateHealthScore(
    rawPrediction.disease, 
    rawPrediction.severity, 
    riskAssessment.level
  );
  
  const recommendations = getRecommendations(rawPrediction.disease, rawPrediction.severity);

  return {
    ...rawPrediction,
    diseaseName: diseaseInfo?.name || 'Unknown',
    diseaseDetails: diseaseInfo,
    riskAssessment,
    healthScore,
    recommendations,
    imageQuality: quality
  };
}
