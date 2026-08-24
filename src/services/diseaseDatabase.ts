export interface DiseaseInfo {
  id: string;
  name: string;
  scientificName: string;
  symptoms: string[];
  affectedParts: string[];
  causes: string[];
  favorableConditions: string[];
  prevention: string[];
  recommendations: string[];
}

const diseases: Record<string, DiseaseInfo> = {
  'healthy': {
    id: 'healthy',
    name: 'Healthy',
    scientificName: 'N/A',
    symptoms: ['None'],
    affectedParts: [],
    causes: [],
    favorableConditions: [],
    prevention: ['Maintain good agricultural practices'],
    recommendations: ['Continue normal monitoring and care']
  },
  'brown_spot': {
    id: 'brown_spot',
    name: 'Brown Spot',
    scientificName: 'Bipolaris oryzae',
    symptoms: ['Many small, oval, brown spots on leaves', 'Spots have light colored centers and dark margins'],
    affectedParts: ['Leaves', 'Glumes'],
    causes: ['Fungus'],
    favorableConditions: ['High humidity', 'Nutrient deficiency, especially Nitrogen'],
    prevention: ['Use resistant varieties', 'Ensure balanced fertilization'],
    recommendations: ['Apply appropriate fungicides. Follow locally approved product labels.', 'Improve soil fertility']
  },
  'leaf_blast': {
    id: 'leaf_blast',
    name: 'Leaf Blast',
    scientificName: 'Magnaporthe oryzae',
    symptoms: ['Diamond-shaped lesions', 'Grey center with brown margin'],
    affectedParts: ['Leaves', 'Nodes', 'Panicles'],
    causes: ['Fungus'],
    favorableConditions: ['High humidity', 'Cool nights and warm days', 'Excessive nitrogen'],
    prevention: ['Plant resistant varieties', 'Split nitrogen applications'],
    recommendations: ['Apply systemic fungicides early. Follow locally approved product labels.', 'Avoid late sowing']
  },
  'bacterial_leaf_blight': {
    id: 'bacterial_leaf_blight',
    name: 'Bacterial Leaf Blight',
    scientificName: 'Xanthomonas oryzae pv. oryzae',
    symptoms: ['Water-soaked to yellowish stripes on leaf blades', 'Wavy margins on lesions'],
    affectedParts: ['Leaves'],
    causes: ['Bacteria'],
    favorableConditions: ['Heavy rain', 'High humidity', 'High temperatures', 'Strong winds'],
    prevention: ['Use resistant varieties', 'Ensure good field drainage'],
    recommendations: ['Use copper-based bactericides. Follow locally approved product labels.', 'Avoid excessive nitrogen']
  },
  'leaf_rust': {
    id: 'leaf_rust',
    name: 'Leaf Rust',
    scientificName: 'Puccinia triticina',
    symptoms: ['Small, round, orange-brown pustules', 'Mainly found on upper leaf surface'],
    affectedParts: ['Leaves'],
    causes: ['Fungus'],
    favorableConditions: ['Warm temperatures (15-22°C)', 'High humidity or dew'],
    prevention: ['Plant resistant wheat varieties', 'Eradicate volunteer wheat'],
    recommendations: ['Apply appropriate foliar fungicides if severe. Follow locally approved product labels.']
  },
  'stripe_rust': {
    id: 'stripe_rust',
    name: 'Stripe Rust',
    scientificName: 'Puccinia striiformis',
    symptoms: ['Yellow-orange pustules arranged in linear stripes', 'Found on leaves and heads'],
    affectedParts: ['Leaves', 'Heads'],
    causes: ['Fungus'],
    favorableConditions: ['Cool temperatures (10-15°C)', 'High moisture'],
    prevention: ['Use highly resistant varieties', 'Monitor fields early in the season'],
    recommendations: ['Apply fungicides early in infection cycle. Follow locally approved product labels.']
  },
  'powdery_mildew': {
    id: 'powdery_mildew',
    name: 'Powdery Mildew',
    scientificName: 'Blumeria graminis',
    symptoms: ['White, powdery fungal patches on leaves and stems', 'Yellowing of lower leaves'],
    affectedParts: ['Leaves', 'Stems', 'Heads'],
    causes: ['Fungus'],
    favorableConditions: ['High humidity (but not free water)', 'Dense crop canopy', 'High nitrogen'],
    prevention: ['Plant resistant varieties', 'Avoid excessive seeding rates and nitrogen'],
    recommendations: ['Apply sulfur-based or systemic fungicides. Follow locally approved product labels.']
  }
};

export function getDiseaseInfo(diseaseId: string): DiseaseInfo | null {
  return diseases[diseaseId] || null;
}
