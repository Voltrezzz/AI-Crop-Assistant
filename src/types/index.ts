// ============================================================
// Marudham 360 — Core Type Definitions
// ============================================================

// --- Crop & Disease ---

export type CropType = 'paddy' | 'wheat';

export type PaddyDisease = 'healthy' | 'brown_spot' | 'hispa' | 'leaf_blast' | 'bacterial_leaf_blight';
export type WheatDisease =
  | 'healthy' | 'aphid' | 'black_rust' | 'blast' | 'brown_rust'
  | 'common_root_rot' | 'fusarium_head_blight' | 'mildew' | 'mite'
  | 'smut' | 'stemfly' | 'tanspot' | 'yellow_rust'
  | 'leaf_rust' | 'stripe_rust' | 'powdery_mildew';
export type Disease = PaddyDisease | WheatDisease;

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';
export type ConfidenceLevel = 'high' | 'moderate' | 'low';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type FieldStatus = 'healthy' | 'attention' | 'critical';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type TrendDirection = 'improving' | 'stable' | 'worsening';

// --- Paddy Growth Stages ---
export type PaddyGrowthStage =
  | 'nursery'
  | 'vegetative'
  | 'tillering'
  | 'panicle_initiation'
  | 'flowering'
  | 'grain_filling'
  | 'maturity';

// --- Wheat Growth Stages ---
export type WheatGrowthStage =
  | 'germination'
  | 'tillering'
  | 'stem_extension'
  | 'booting'
  | 'heading'
  | 'flowering'
  | 'grain_filling'
  | 'maturity';

export type GrowthStage = PaddyGrowthStage | WheatGrowthStage;

// --- AI Prediction ---

export interface Prediction {
  crop: CropType;
  disease: Disease;
  diseaseName: string;
  scientificName: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  severity: SeverityLevel;
  healthScore: number;
  symptoms: string[];
  risk: RiskLevel;
  isPrototype: boolean;
}

// --- Scan ---

export interface Scan {
  id?: number;
  cloudId?: string;
  userId?: number;
  fieldId?: number;
  fieldCloudId?: string;
  crop: CropType;
  disease: Disease;
  diseaseName: string;
  scientificName: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  severity: SeverityLevel | null;
  healthScore: number | null;
  risk: RiskLevel | null;
  symptoms: string[];
  recommendations: RecommendationSet;
  imageData: string; // base64
  thumbnailData?: string;
  weatherSnapshot?: WeatherData;
  growthStage?: GrowthStage;
  date: string; // ISO
  syncStatus: SyncStatus;
  isPrototype: boolean;
}

// --- Recommendation ---

export interface RecommendationSet {
  culturalPractices: string[];
  organicOptions: string[];
  chemicalControl: string[];
  precautions: string[];
}

// --- Field ---

export interface Field {
  id?: number;
  cloudId?: string;
  userId?: number;
  name: string;
  area: number;
  areaUnit: string;
  crop: CropType;
  variety: string;
  location: string;
  plantingDate: string;
  expectedHarvest: string;
  growthStage: GrowthStage;
  healthScore: number;
  status: FieldStatus;
  diseaseRisk: RiskLevel;
  lastScanDate?: string;
  lastScanId?: number;
}

// --- Weather ---

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  windDirection: string;
  condition: string;
  icon: string;
  location: string;
  updatedAt: string;
  isOffline: boolean;
}

export interface WeatherForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  rainfall: number;
  condition: string;
  icon: string;
}

// --- Growth Record ---

export interface GrowthRecord {
  id?: number;
  userId?: number;
  fieldId: number;
  stage: GrowthStage;
  date: string;
  daysAfterPlanting: number;
  notes: string;
  healthScore: number;
}

// --- Advisory ---

export interface Advisory {
  id?: number;
  userId?: number;
  type: 'weather' | 'disease' | 'growth' | 'preventive';
  title: string;
  message: string;
  crop?: CropType;
  severity: SeverityLevel;
  date: string;
  isRead: boolean;
}

// --- Notification ---

export interface AppNotification {
  id?: number;
  userId?: number;
  type: 'disease_detected' | 'followup' | 'weather_risk' | 'growth_reminder' | 'high_risk' | 'sync_complete' | 'alert' | 'scheme';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  link?: string;
}

// --- Sync ---

export interface SyncItem {
  id?: number;
  userId?: number;
  entity: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  createdAt: string;
  retryCount: number;
  status: SyncStatus;
}

// --- User ---

export type SupportedLanguage = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or';

export interface Profile { id?: number; cloudId?: string; userId?: number; name: string; avatarUrl?: string; type: 'admin' | 'farmer' | 'worker'; language?: SupportedLanguage; }
export interface User {
  id?: number;
  cloudId?: string;
  contractId?: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  state: string;
  language: SupportedLanguage;
  isDemo: boolean;
  joinDate?: string;
}

// --- Settings ---

export interface AppSettings {
  id?: number;
  userId?: number;
  language: SupportedLanguage;
  theme: 'light' | 'dark';
  notifications: boolean;
  autoSync: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  offlineMode: boolean;
}

// --- Disease Info (knowledge base) ---

export interface DiseaseInfo {
  disease: Disease;
  crop: CropType;
  name: string;
  scientificName: string;
  symptoms: string[];
  affectedParts: string[];
  causes: string[];
  favorableConditions: string[];
  prevention: string[];
  recommendations: RecommendationSet;
}

// --- Crop Cycle ---

export interface CropCycle {
  id?: number;
  userId?: number;
  fieldId: number;
  crop: CropType;
  variety: string;
  startDate: string;
  expectedEndDate: string;
  currentStage: GrowthStage;
  status: 'active' | 'completed' | 'abandoned';
}

// --- Model metadata ---

export interface ModelMetadata {
  id?: number;
  modelName: string;
  version: string;
  loadedAt: string;
  isDemo: boolean;
  accuracy?: number;
}

// ============================================================
// NEW FEATURES — Extended Type Definitions
// ============================================================

// --- Water Irrigation ---

export interface IrrigationRecord {
  id?: number;
  userId?: number;
  fieldId?: number;
  fieldName: string;
  landArea: number;
  landAreaUnit: 'acres' | 'hectares' | 'bigha';
  cropType: CropType;
  motorHorsepower: number;
  motorEfficiency: number; // 0-100
  pipelineDiameterMm: number;
  waterSourceDepth: number; // meters
  soilType: 'clay' | 'loam' | 'sandy' | 'silt';
  growthStage: GrowthStage;
  waterRequirementLiters: number;
  irrigationDurationMinutes: number;
  flowRateLpm: number;
  estimatedCostRupees: number;
  electricityUnits: number;
  date: string;
  notes: string;
}

// --- Land Segregation ---

export interface LandParcel {
  id?: number;
  userId?: number;
  name: string;
  area: number;
  areaUnit: 'acres' | 'hectares' | 'bigha';
  crop: CropType | 'vegetables' | 'fruits' | 'fallow' | 'grazing' | 'other';
  variety: string;
  soilType: string;
  irrigationType: 'canal' | 'borewell' | 'rainfed' | 'drip' | 'sprinkler';
  status: 'cultivated' | 'fallow' | 'preparation' | 'harvested';
  color: string; // hex for map display
  notes: string;
}

export interface FarmOverview {
  totalArea: number;
  cultivatedArea: number;
  fallowArea: number;
  parcels: LandParcel[];
  cropDistribution: { crop: string; area: number; percentage: number }[];
}

// --- Animals Monitoring ---

export type AnimalType = 'cow' | 'buffalo' | 'goat' | 'sheep' | 'poultry' | 'other';
export type AnimalHealthStatus = 'healthy' | 'sick' | 'under_treatment' | 'recovered';

export interface Animal {
  id?: number;
  userId?: number;
  name: string;
  type: AnimalType;
  breed: string;
  tagNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  weight: number;
  healthStatus: AnimalHealthStatus;
  notes: string;
  imageData?: string;
}

export interface VaccinationRecord {
  id?: number;
  userId?: number;
  animalId: number;
  animalName: string;
  vaccineName: string;
  disease: string;
  dateAdministered: string;
  nextDueDate: string;
  veterinarianName: string;
  batchNumber: string;
  dosage: string;
  status: 'completed' | 'due' | 'overdue' | 'scheduled';
  notes: string;
}

export interface AnimalHealthRecord {
  id?: number;
  userId?: number;
  animalId: number;
  date: string;
  condition: string;
  symptoms: string[];
  treatment: string;
  medication: string;
  veterinarianName: string;
  cost: number;
  followUpDate?: string;
  status: 'ongoing' | 'resolved';
}

// --- Loan Tracking ---

export type LoanStatus = 'active' | 'paid' | 'overdue' | 'pending_approval' | 'rejected';
export type LoanType = 'crop_loan' | 'kcc' | 'animal_husbandry' | 'equipment' | 'land_development' | 'other';

export interface Loan {
  id?: number;
  userId?: number;
  loanType: LoanType;
  bankName: string;
  accountNumber: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  startDate: string;
  endDate: string;
  amountPaid: number;
  amountRemaining: number;
  status: LoanStatus;
  nextPaymentDate: string;
  notes: string;
}

export interface GovernmentScheme {
  id?: number;
  userId?: number;
  schemeName: string;
  ministry: string;
  description: string;
  eligibility: string[];
  benefits: string[];
  applicationDeadline: string;
  websiteUrl: string;
  category: 'subsidy' | 'insurance' | 'loan' | 'training' | 'market' | 'equipment';
  applicableCrops: string[];
  isApplied: boolean;
  applicationStatus?: string;
}

// --- Fertilizer Shops ---

export interface FertilizerShop {
  id?: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rating: number;
  isOpen: boolean;
  timings: string;
  products: string[];
  isVerified: boolean;
  type: 'government' | 'cooperative' | 'private';
}

// --- Market Analysis (Pre/Post Harvest) ---

export type MarketType = 'government_mandi' | 'private_market' | 'cooperative' | 'online';

export interface MarketPrice {
  id?: number;
  crop: string;
  variety: string;
  market: string;
  marketType: MarketType;
  location: string;
  state: string;
  minPrice: number; // INR per quintal
  maxPrice: number;
  modalPrice: number;
  date: string;
  arrivalTonnes: number;
}

export interface HarvestAnalysis {
  id?: number;
  userId?: number;
  fieldId?: number;
  crop: string;
  variety: string;
  estimatedYieldKg: number;
  actualYieldKg?: number;
  qualityGrade: 'A' | 'B' | 'C';
  moistureContent: number;
  harvestDate: string;
  stage: 'pre_harvest' | 'post_harvest';
  bestMarket?: string;
  bestPrice?: number;
  recommendations: string[];
  storageAdvice: string[];
}

// --- Insect Bite Detector ---

export type InsectBiteSeverity = 'harmless' | 'mild' | 'moderate' | 'serious' | 'emergency';

export interface InsectBiteScan {
  id?: number;
  userId?: number;
  imageData: string;
  insectType: string;
  commonName: string;
  scientificName: string;
  severity: InsectBiteSeverity;
  confidence: number;
  symptoms: string[];
  firstAid: string[];
  seekMedicalAttention: boolean;
  medicalUrgency: string;
  preventionTips: string[];
  date: string;
  isPrototype: boolean;
}

// --- Gemini Visual Pest Advisory ---

export type PestCropSelection = 'paddy' | 'wheat' | 'unspecified';
export type PestAdvisoryConfidence = 'low' | 'moderate' | 'high';

export interface PestAdvisory {
  possibleIssue: string;
  crop: 'Paddy/Rice' | 'Wheat' | 'Unknown';
  confidence: PestAdvisoryConfidence;
  visibleSigns: string[];
  possiblePests: string[];
  recommendedActions: string[];
  organicOptions: string[];
  chemicalGuidance: string[];
  precautions: string[];
  needsExpertReview: boolean;
  cropMismatch: boolean;
  imageQuality: 'adequate' | 'poor';
  imageAssessment: 'suitable' | 'poor_quality' | 'unrelated' | 'no_obvious_damage';
  summary: string;
}

export interface PestAdvisoryRecord extends PestAdvisory {
  id?: number;
  userId: number;
  selectedCrop: PestCropSelection;
  imageData: string;
  date: string;
  source: 'gemini';
}

// --- AI Chatbot ---

export interface ChatMessage {
  id?: number;
  cloudId?: string;
  userId?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  language: string;
  category?: 'crop' | 'weather' | 'disease' | 'irrigation' | 'market' | 'general' | 'animal' | 'loan' | 'insect';
}

// --- Supported Languages ---

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  bn: 'বাংলা',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  or: 'ଓଡ଼ିଆ',
};

export interface DocumentFile { id?: number; userId?: number; name: string; type: string; size: number; date: string; dataUrl?: string; }

// --- Social & Chat ---

export interface Friend {
  id?: number;
  userId?: number;
  friendId: string; // we'll use cloudId as friendId for cross-device syncing
  name: string;
  avatarUrl?: string;
  status: 'pending' | 'accepted' | 'blocked';
  isIncoming: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id?: number;
  userId?: number;
  conversationId: string; // The friend's cloudId
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  readStatus: boolean;
}

export interface ComparisonResult {
  userId: string;
  userName: string;
  contractId: string;
  fields: Field[];
  scans: Scan[];
  landParcels: LandParcel[];
}
