import { subDays } from 'date-fns';
import { db } from './database';
import { User, Field, Scan, WeatherData, AppNotification, AppSettings, Profile } from '@/types';

export const seedDatabase = async () => {
  const userCount = await db.users.count();
  if (userCount > 0) {
    const demoUser = await db.users.filter((user) => user.isDemo).first();
    if (!demoUser?.id) return;

    // Earlier feature pages created Demo data without userId. Adopt only those
    // unowned legacy rows into the Demo account; never touch owned user data.
    const userTables = [
      'fields', 'cropCycles', 'scans', 'growthRecords', 'advisories',
      'notifications', 'settings', 'syncQueue', 'irrigationRecords',
      'landParcels', 'animals', 'vaccinations', 'animalHealth', 'loans',
      'governmentSchemes', 'harvestAnalysis', 'insectBiteScans',
      'chatMessages', 'documents'
    ];
    await db.transaction('rw', userTables.map((name) => db.table(name)), async () => {
      await Promise.all(userTables.map((name) => (
        db.table(name).filter((record) => !record.userId).modify({ userId: demoUser.id })
      )));
    });
    return;
  }

  const demoUser: User = {
    name: 'Ramesh',
    phone: '+91 98765 43210',
    email: 'ramesh@example.com',
    location: 'Thanjavur',
    state: 'Tamil Nadu, India',
    language: 'en',
    isDemo: true,
    joinDate: new Date().toISOString()
  };
  const userId = await db.users.add(demoUser);

  // Create default profile for demo user
  const demoProfile: Profile = {
    userId: userId,
    name: 'Ramesh',
    type: 'farmer',
    language: 'en'
  };
  await db.profiles.add(demoProfile);

  const fields: Field[] = [
    {
      userId: userId,
      name: 'North Paddy',
      area: 2.4,
      areaUnit: 'acres',
      crop: 'paddy',
      variety: 'BPT 5204',
      location: 'North Block',
      plantingDate: subDays(new Date(), 45).toISOString(),
      expectedHarvest: subDays(new Date(), -75).toISOString(),
      growthStage: 'tillering',
      healthScore: 92,
      status: 'healthy',
      diseaseRisk: 'low'
    },
    {
      userId: userId,
      name: 'East Paddy',
      area: 1.8,
      areaUnit: 'acres',
      crop: 'paddy',
      variety: 'ADT 43',
      location: 'East Block',
      plantingDate: subDays(new Date(), 50).toISOString(),
      expectedHarvest: subDays(new Date(), -70).toISOString(),
      growthStage: 'panicle_initiation',
      healthScore: 68,
      status: 'attention',
      diseaseRisk: 'high'
    },
    {
      userId: userId,
      name: 'West Wheat',
      area: 3.1,
      areaUnit: 'acres',
      crop: 'wheat',
      variety: 'HD 2967',
      location: 'West Block',
      plantingDate: subDays(new Date(), 30).toISOString(),
      expectedHarvest: subDays(new Date(), -90).toISOString(),
      growthStage: 'tillering',
      healthScore: 88,
      status: 'healthy',
      diseaseRisk: 'medium'
    },
    {
      userId: userId,
      name: 'South Wheat',
      area: 2.0,
      areaUnit: 'acres',
      crop: 'wheat',
      variety: 'DBW 187',
      location: 'South Block',
      plantingDate: subDays(new Date(), 25).toISOString(),
      expectedHarvest: subDays(new Date(), -95).toISOString(),
      growthStage: 'tillering',
      healthScore: 95,
      status: 'healthy',
      diseaseRisk: 'low'
    }
  ];

  const fieldIds = [];
  for (const f of fields) {
    const id = await db.fields.add(f);
    fieldIds.push(id);
  }

  const baseRec = {
    culturalPractices: ['Maintain proper spacing', 'Avoid excessive nitrogen'],
    organicOptions: ['Neem oil spray 1500ppm @ 5ml/lit'],
    chemicalControl: ['Propiconazole 25% EC @ 1ml/lit'],
    precautions: ['Spray in morning or evening hours']
  };

  const scans: Scan[] = [
    {
      userId: userId,
      fieldId: fieldIds[0],
      crop: 'paddy',
      disease: 'healthy',
      diseaseName: 'Healthy',
      scientificName: '-',
      confidence: 0.96,
      confidenceLevel: 'high',
      severity: 'low',
      healthScore: 95,
      risk: 'low',
      symptoms: [],
      recommendations: { ...baseRec, chemicalControl: [] },
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 1).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[1],
      crop: 'paddy',
      disease: 'brown_spot',
      diseaseName: 'Brown Spot',
      scientificName: 'Bipolaris oryzae',
      confidence: 0.89,
      confidenceLevel: 'high',
      severity: 'moderate',
      healthScore: 65,
      risk: 'medium',
      symptoms: ['Brown oval spots on leaves'],
      recommendations: baseRec,
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 2).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[1],
      crop: 'paddy',
      disease: 'leaf_blast',
      diseaseName: 'Leaf Blast',
      scientificName: 'Magnaporthe oryzae',
      confidence: 0.92,
      confidenceLevel: 'high',
      severity: 'high',
      healthScore: 50,
      risk: 'high',
      symptoms: ['Diamond shaped lesions'],
      recommendations: baseRec,
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 4).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[1],
      crop: 'paddy',
      disease: 'bacterial_leaf_blight',
      diseaseName: 'Bacterial Leaf Blight',
      scientificName: 'Xanthomonas oryzae',
      confidence: 0.85,
      confidenceLevel: 'high',
      severity: 'high',
      healthScore: 55,
      risk: 'high',
      symptoms: ['Water-soaked to yellowish stripes'],
      recommendations: baseRec,
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 6).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[2],
      crop: 'wheat',
      disease: 'healthy',
      diseaseName: 'Healthy',
      scientificName: '-',
      confidence: 0.94,
      confidenceLevel: 'high',
      severity: 'low',
      healthScore: 92,
      risk: 'low',
      symptoms: [],
      recommendations: { ...baseRec, chemicalControl: [] },
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 3).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[2],
      crop: 'wheat',
      disease: 'leaf_rust',
      diseaseName: 'Leaf Rust',
      scientificName: 'Puccinia triticina',
      confidence: 0.88,
      confidenceLevel: 'high',
      severity: 'moderate',
      healthScore: 72,
      risk: 'medium',
      symptoms: ['Small brown pustules on leaf blades'],
      recommendations: baseRec,
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 7).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[3],
      crop: 'wheat',
      disease: 'healthy',
      diseaseName: 'Healthy',
      scientificName: '-',
      confidence: 0.96,
      confidenceLevel: 'high',
      severity: 'low',
      healthScore: 94,
      risk: 'low',
      symptoms: [],
      recommendations: { ...baseRec, chemicalControl: [] },
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 5).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[3],
      crop: 'wheat',
      disease: 'stripe_rust',
      diseaseName: 'Stripe Rust',
      scientificName: 'Puccinia striiformis',
      confidence: 0.91,
      confidenceLevel: 'high',
      severity: 'high',
      healthScore: 58,
      risk: 'high',
      symptoms: ['Yellow pustules in stripes on leaves'],
      recommendations: baseRec,
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 10).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[0],
      crop: 'paddy',
      disease: 'healthy',
      diseaseName: 'Healthy',
      scientificName: '-',
      confidence: 0.93,
      confidenceLevel: 'high',
      severity: 'low',
      healthScore: 90,
      risk: 'low',
      symptoms: [],
      recommendations: { ...baseRec, chemicalControl: [] },
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 12).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    },
    {
      userId: userId,
      fieldId: fieldIds[2],
      crop: 'wheat',
      disease: 'powdery_mildew',
      diseaseName: 'Powdery Mildew',
      scientificName: 'Blumeria graminis',
      confidence: 0.82,
      confidenceLevel: 'high',
      severity: 'moderate',
      healthScore: 75,
      risk: 'medium',
      symptoms: ['White powdery fungal growth on leaves'],
      recommendations: baseRec,
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 15).toISOString(),
      syncStatus: 'synced',
      isPrototype: true
    }
  ];

  await db.scans.bulkAdd(scans);

  const weather: WeatherData = {
    temperature: 32,
    humidity: 78,
    rainfall: 12.5,
    windSpeed: 15,
    windDirection: 'NE',
    condition: 'Partly Cloudy',
    icon: 'partly-cloudy',
    location: 'Thanjavur',
    updatedAt: new Date('2026-08-20T11:08:13+05:30').toISOString(),
    isOffline: false
  };
  await db.weather.add(weather);

  const notifications: AppNotification[] = [
    {
      userId: userId,
      type: 'alert',
      title: 'GOVERNMENT SCHEME: PM-KISAN',
      message: 'The next installment of PM-KISAN (₹2000) will be credited to your linked bank account next week.',
      date: new Date().toISOString(),
      isRead: false
    },
    {
      userId: userId,
      type: 'weather_risk',
      title: 'EXTREME WEATHER ALERT',
      message: 'Cyclonic storm expected in your district within 48 hrs. Please secure livestock and harvested crops.',
      date: new Date().toISOString(),
      isRead: false
    },
    {
      userId: userId,
      type: 'disease_detected',
      title: 'High Risk Alert',
      message: 'Leaf Blast detected in East Paddy field. Immediate action required.',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 1).toISOString(),
      isRead: false
    },
    {
      userId: userId,
      type: 'weather_risk',
      title: 'Heavy Rain Forecast',
      message: 'High humidity expected tomorrow. Good condition for fungal growth.',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 2).toISOString(),
      isRead: true
    }
  ];
  await db.notifications.bulkAdd(notifications);

  const settings: AppSettings = {
    userId: userId,
    language: 'en',
    theme: 'light',
    notifications: true,
    autoSync: true,
    imageQuality: 'medium',
    offlineMode: false
  };
  await db.settings.add(settings);

  console.log('Database seeded successfully with user ID:', userId);
};
