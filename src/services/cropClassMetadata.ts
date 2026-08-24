import type { RecommendationSet } from '@/types';

export const MODEL_CLASS_LABELS = [
  'Rice_BrownSpot',
  'Rice_Healthy',
  'Rice_Hispa',
  'Rice_LeafBlast',
  'Wheat_Aphid',
  'Wheat_BlackRust',
  'Wheat_Blast',
  'Wheat_BrownRust',
  'Wheat_CommonRootRot',
  'Wheat_FusariumHeadBlight',
  'Wheat_Healthy',
  'Wheat_Mildew',
  'Wheat_Mite',
  'Wheat_Smut',
  'Wheat_Stemfly',
  'Wheat_Tanspot',
  'Wheat_YellowRust',
] as const;

export type ModelClassLabel = (typeof MODEL_CLASS_LABELS)[number];

export interface CropClassMetadata {
  displayName: string;
  category: string;
  scientificName?: string;
  isHealthy: boolean;
  symptoms: string[];
  recommendations: RecommendationSet;
}

const STANDARD_PRECAUTIONS = [
  'Confirm the diagnosis with a local agronomist or extension service before treatment.',
  'Use only products registered for the crop and condition in your location; follow the label, protective-equipment, re-entry, and pre-harvest instructions.',
  'Do not apply a pesticide solely from an image-classifier result.',
];

const guidance = (
  cultural: string[],
  organic: string[],
  chemical: string[],
  precautions: string[] = [],
): RecommendationSet => ({
  culturalPractices: cultural,
  organicOptions: organic,
  chemicalControl: chemical,
  precautions: [...precautions, ...STANDARD_PRECAUTIONS],
});

const healthyGuidance: RecommendationSet = {
  culturalPractices: ['Maintain balanced nutrition, suitable irrigation, field sanitation, and good crop airflow.'],
  organicOptions: ['Support soil health and beneficial organisms; no curative product is needed for a healthy classification.'],
  chemicalControl: ['No chemical treatment is recommended for a healthy classification.'],
  precautions: [
    'A healthy image classification does not rule out problems elsewhere in the field.',
    'Rescan or seek local advice if symptoms develop or crop performance declines.',
  ],
};

export const CROP_CLASS_METADATA = {
  Rice_BrownSpot: {
    displayName: 'Rice Brown Spot',
    category: 'Fungal disease',
    scientificName: 'Bipolaris oryzae',
    isHealthy: false,
    symptoms: ['Oval brown leaf spots, often with gray centers', 'Yellow halos around established spots', 'Grain discoloration or seedling weakness in severe cases'],
    recommendations: guidance(
      ['Use clean seed and tolerant varieties where available.', 'Maintain balanced fertility, especially adequate potassium, and avoid plant stress.', 'Manage infected residue and improve drainage and canopy airflow.'],
      ['Use locally validated biological seed or foliar products where available.', 'Improve soil organic matter and crop vigor rather than relying on unverified remedies.'],
      ['A registered rice fungicide may be considered after field confirmation and local threshold advice.'],
    ),
  },
  Rice_Healthy: {
    displayName: 'Healthy Rice',
    category: 'Healthy',
    isHealthy: true,
    symptoms: ['Leaves appear uniformly green without characteristic disease lesions', 'No obvious pest feeding damage is visible in the analyzed image'],
    recommendations: healthyGuidance,
  },
  Rice_Hispa: {
    displayName: 'Rice Hispa',
    category: 'Insect pest',
    scientificName: 'Dicladispa armigera',
    isHealthy: false,
    symptoms: ['White parallel scrape marks on leaves', 'Blotch-like leaf mines made by larvae', 'Drying or whitening of heavily attacked foliage'],
    recommendations: guidance(
      ['Monitor young leaves and remove heavily mined leaves in small infestations.', 'Avoid excessive nitrogen and manage weeds that can host the pest.'],
      ['Conserve natural enemies and use approved neem-based products only where locally recommended.'],
      ['Use a registered rice insecticide only when local action thresholds are reached; prefer options that spare beneficial insects.'],
    ),
  },
  Rice_LeafBlast: {
    displayName: 'Rice Leaf Blast',
    category: 'Fungal disease',
    scientificName: 'Magnaporthe oryzae',
    isHealthy: false,
    symptoms: ['Spindle-shaped lesions with gray centers and brown margins', 'Lesions expanding and joining under favorable conditions', 'Leaf drying when infection is severe'],
    recommendations: guidance(
      ['Use resistant varieties and clean seed where available.', 'Avoid excessive nitrogen, maintain suitable spacing, and manage irrigation to reduce prolonged leaf wetness.', 'Remove or incorporate infected residue according to local practice.'],
      ['Use locally validated biological controls as part of an integrated program.'],
      ['A registered blast fungicide may be useful when diagnosis and timing are confirmed by local crop guidance.'],
    ),
  },
  Wheat_Aphid: {
    displayName: 'Wheat Aphid',
    category: 'Insect pest',
    isHealthy: false,
    symptoms: ['Clusters of small aphids on leaves, stems, or heads', 'Leaf yellowing, curling, or reduced vigor', 'Sticky honeydew and sometimes sooty growth'],
    recommendations: guidance(
      ['Check multiple field locations and compare counts with local economic thresholds.', 'Avoid excess nitrogen and control volunteer cereal hosts where appropriate.'],
      ['Conserve lady beetles, lacewings, parasitoids, and other natural enemies.', 'Insecticidal soap or neem products may help small infestations where registered.'],
      ['If thresholds are exceeded, choose a locally registered selective aphicide with extension guidance.'],
    ),
  },
  Wheat_BlackRust: {
    displayName: 'Wheat Black Rust',
    category: 'Fungal disease',
    scientificName: 'Puccinia graminis f. sp. tritici',
    isHealthy: false,
    symptoms: ['Elongated reddish-brown pustules on stems, sheaths, or leaves', 'Pustules becoming black later in the season', 'Weak stems, shriveled grain, or lodging in severe infections'],
    recommendations: guidance(
      ['Grow locally resistant varieties and remove volunteer wheat that carries rust between crops.', 'Use locally recommended planting dates and monitor nearby rust reports.'],
      ['No consistently curative organic treatment is established; focus on resistance, sanitation, and monitoring.'],
      ['A registered wheat fungicide may be warranted after confirmation, particularly when susceptible crops are at a vulnerable stage.'],
    ),
  },
  Wheat_Blast: {
    displayName: 'Wheat Blast',
    category: 'Fungal disease',
    scientificName: 'Magnaporthe oryzae pathotype Triticum',
    isHealthy: false,
    symptoms: ['Premature bleaching of part or all of a wheat head', 'Dark lesions on the rachis below bleached portions', 'Shriveled or poorly filled grain'],
    recommendations: guidance(
      ['Seek prompt confirmation from a local plant-health authority because similar head symptoms have other causes.', 'Use certified seed, resistant varieties where available, recommended sowing dates, and residue management.', 'Avoid moving seed or infected plant material from suspect fields.'],
      ['No reliable curative organic treatment is established; use only biological products validated by local trials.'],
      ['Seed treatment and carefully timed registered foliar fungicides may form part of an official local program, but protection can be incomplete and timing is critical.'],
      ['Follow local reporting or quarantine guidance for suspected wheat blast.', 'Do not retain grain from a suspect field as planting seed without official advice.'],
    ),
  },
  Wheat_BrownRust: {
    displayName: 'Wheat Brown Rust',
    category: 'Fungal disease',
    scientificName: 'Puccinia triticina',
    isHealthy: false,
    symptoms: ['Small orange-brown pustules scattered mainly over leaf surfaces', 'Yellowing around dense pustules', 'Early leaf drying and reduced grain fill when severe'],
    recommendations: guidance(
      ['Use resistant varieties, remove volunteer wheat, and monitor the crop from early growth.', 'Maintain balanced fertility and locally recommended planting dates.'],
      ['No reliable curative organic option is established; emphasize resistant varieties and field monitoring.'],
      ['Consider a registered foliar fungicide only after confirmation and assessment of crop stage, susceptibility, and disease pressure.'],
    ),
  },
  Wheat_CommonRootRot: {
    displayName: 'Wheat Common Root Rot',
    category: 'Fungal disease',
    scientificName: 'Bipolaris sorokiniana',
    isHealthy: false,
    symptoms: ['Dark brown lesions on roots, crowns, or lower stems', 'Poor emergence, stunting, or premature ripening', 'Sparse roots and weakened plants that pull up easily'],
    recommendations: guidance(
      ['Rotate with non-cereal crops where practical and use clean, vigorous seed.', 'Reduce plant stress through balanced fertility, suitable seeding depth, and good soil structure.', 'Manage infected cereal residue and grassy volunteers.'],
      ['Use locally validated biological seed treatments where available.'],
      ['A registered fungicidal seed treatment can reduce seedling infection; established root damage is not cured by foliar spraying.'],
    ),
  },
  Wheat_FusariumHeadBlight: {
    displayName: 'Wheat Fusarium Head Blight',
    category: 'Fungal disease',
    scientificName: 'Fusarium species complex',
    isHealthy: false,
    symptoms: ['Premature bleaching of individual spikelets or whole heads', 'Pink or orange fungal growth in humid conditions', 'Lightweight, shriveled, or chalky kernels'],
    recommendations: guidance(
      ['Use tolerant varieties, rotate away from susceptible cereals, and manage infected residue.', 'Avoid irrigation that prolongs head wetness during flowering when possible.', 'Harvest and store suspect grain separately pending quality assessment.'],
      ['Use only biological products supported by local field trials; they are not a substitute for mycotoxin management.'],
      ['A registered fungicide applied at the locally recommended flowering window may suppress disease but will not eliminate risk.'],
      ['Have suspect grain tested for mycotoxins before food or feed use.', 'Do not blend contaminated grain to dilute it.'],
    ),
  },
  Wheat_Healthy: {
    displayName: 'Healthy Wheat',
    category: 'Healthy',
    isHealthy: true,
    symptoms: ['Leaves and stems appear normally colored without characteristic lesions or pest damage', 'No obvious disease signs are visible in the analyzed image'],
    recommendations: healthyGuidance,
  },
  Wheat_Mildew: {
    displayName: 'Wheat Powdery Mildew',
    category: 'Fungal disease',
    scientificName: 'Blumeria graminis f. sp. tritici',
    isHealthy: false,
    symptoms: ['White or gray powdery patches on leaves and stems', 'Yellowing beneath older colonies', 'Dark specks in mature fungal growth and premature leaf decline'],
    recommendations: guidance(
      ['Use resistant varieties, suitable spacing, and balanced nitrogen.', 'Reduce volunteer wheat and dense, humid canopy conditions where practical.'],
      ['Sulfur or biological products may be options where registered and supported by local guidance; avoid use under crop-stressing conditions.'],
      ['Use a registered fungicide only if disease pressure, crop stage, and expected yield response justify treatment.'],
    ),
  },
  Wheat_Mite: {
    displayName: 'Wheat Mite Damage',
    category: 'Mite pest',
    isHealthy: false,
    symptoms: ['Fine yellow stippling, silvering, or bronzing of leaves', 'Leaf curling, drying, or plant stunting', 'Very small mites may be visible with magnification'],
    recommendations: guidance(
      ['Confirm the mite species because management differs among wheat mites.', 'Control volunteer cereals and grassy hosts during the locally recommended host-free period.', 'Avoid moving infested plant material between fields.'],
      ['Conserve predatory mites and other natural enemies; use approved oils or soaps only when appropriate for the identified species.'],
      ['Miticides or insecticides are species- and region-specific and may not work once damage is advanced; use only local expert advice.'],
    ),
  },
  Wheat_Smut: {
    displayName: 'Wheat Smut',
    category: 'Fungal disease',
    scientificName: 'Smut fungi',
    isHealthy: false,
    symptoms: ['Black powdery spore masses replacing grain or head tissue', 'Distorted heads or kernels', 'Affected heads may emerge differently or release dark spores'],
    recommendations: guidance(
      ['Plant certified disease-free seed and resistant varieties.', 'Clean planting and harvesting equipment and avoid saving seed from affected fields.', 'Use crop rotation and sanitation according to the smut species confirmed locally.'],
      ['Use biological seed treatments only where locally validated for the confirmed smut species.'],
      ['A registered fungicidal seed treatment before sowing is the usual chemical approach; foliar sprays do not cure infected heads.'],
    ),
  },
  Wheat_Stemfly: {
    displayName: 'Wheat Stem Fly',
    category: 'Insect pest',
    isHealthy: false,
    symptoms: ['Central shoots or heads drying while surrounding tissue remains green', 'Larval tunneling or frass inside stems', 'Weak stems, white heads, or lodging'],
    recommendations: guidance(
      ['Split affected stems to confirm larvae and identify the pest locally.', 'Use recommended sowing dates, crop rotation, residue management, and destruction of volunteer hosts.', 'Remove isolated infested tillers where practical.'],
      ['Conserve parasitoids and other beneficial insects; avoid unnecessary broad-spectrum sprays.'],
      ['Chemical control is often limited after larvae enter stems; apply only a locally registered option at the advised adult or egg-laying stage.'],
    ),
  },
  Wheat_Tanspot: {
    displayName: 'Wheat Tan Spot',
    category: 'Fungal disease',
    scientificName: 'Pyrenophora tritici-repentis',
    isHealthy: false,
    symptoms: ['Tan oval leaf lesions with yellow halos', 'Small dark centers in established lesions', 'Lesions joining and causing large areas of leaf blight'],
    recommendations: guidance(
      ['Use resistant varieties, rotate with non-host crops, and manage infected wheat residue.', 'Use clean seed and maintain balanced crop nutrition.'],
      ['Use biological products only where local field evidence supports them.'],
      ['A registered foliar fungicide may be considered after confirmation when disease pressure and crop economics justify it.'],
    ),
  },
  Wheat_YellowRust: {
    displayName: 'Wheat Yellow Rust',
    category: 'Fungal disease',
    scientificName: 'Puccinia striiformis f. sp. tritici',
    isHealthy: false,
    symptoms: ['Bright yellow pustules arranged in narrow stripes on leaves', 'Yellowing and drying of heavily infected leaves', 'Pustules on leaf sheaths or heads in severe cases'],
    recommendations: guidance(
      ['Grow resistant varieties, remove volunteer wheat, and monitor from early growth during cool, moist weather.', 'Follow locally recommended sowing dates and balanced fertility.'],
      ['No dependable curative organic treatment is established; prioritize resistance and early monitoring.'],
      ['A registered wheat fungicide may be warranted after confirmation, especially on susceptible varieties before major leaf damage.'],
    ),
  },
} satisfies Record<ModelClassLabel, CropClassMetadata>;

export function getCropClassMetadata(className?: string | null): CropClassMetadata | undefined {
  if (!className || !MODEL_CLASS_LABELS.includes(className as ModelClassLabel)) return undefined;
  return CROP_CLASS_METADATA[className as ModelClassLabel];
}
