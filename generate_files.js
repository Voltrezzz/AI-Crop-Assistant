const fs = require('fs');
const path = require('path');

const projectDir = 'C:\\Users\\gowth\\.gemini\\antigravity\\scratch\\cropsense-ai';

const files = {
  'src/db/database.ts': `import Dexie, { Table } from 'dexie';
import { 
  User, Field, CropCycle, Scan, GrowthRecord, 
  WeatherData, Advisory, AppNotification, 
  AppSettings, SyncItem, ModelMetadata
} from '@/types';

export class CropSenseDatabase extends Dexie {
  users!: Table<User, number>;
  fields!: Table<Field, number>;
  cropCycles!: Table<CropCycle, number>;
  scans!: Table<Scan, number>;
  growthRecords!: Table<GrowthRecord, number>;
  weather!: Table<WeatherData, number>;
  advisories!: Table<Advisory, number>;
  notifications!: Table<AppNotification, number>;
  recommendations!: Table<any, number>;
  settings!: Table<AppSettings, number>;
  syncQueue!: Table<SyncItem, number>;
  modelMetadata!: Table<ModelMetadata, number>;

  constructor() {
    super('CropSenseDB');
    this.version(1).stores({
      users: '++id, name, email, phone',
      fields: '++id, name, crop, status',
      cropCycles: '++id, fieldId, crop, status',
      scans: '++id, fieldId, crop, disease, date, syncStatus',
      growthRecords: '++id, fieldId, date',
      weather: '++id, location, updatedAt',
      advisories: '++id, type, date, isRead',
      notifications: '++id, type, date, isRead',
      recommendations: '++id, disease',
      settings: '++id',
      syncQueue: '++id, entity, status',
      modelMetadata: '++id, modelName'
    });
  }
}

export const db = new CropSenseDatabase();
`,

  'src/stores/authStore.ts': `import { create } from 'zustand';
import { User } from '@/types';
import { db } from '@/db/database';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isDemo: boolean;
  login: (user: User) => void;
  logout: () => void;
  loginAsDemo: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isDemo: false,
  login: (user) => set({ user, isLoggedIn: true, isDemo: user.isDemo }),
  logout: () => set({ user: null, isLoggedIn: false, isDemo: false }),
  loginAsDemo: async () => {
    const users = await db.users.toArray();
    const demoUser = users.find(u => u.isDemo) || users[0];
    if (demoUser) {
      set({ user: demoUser, isLoggedIn: true, isDemo: true });
    }
  }
}));
`,

  'src/stores/fieldStore.ts': `import { create } from 'zustand';
import { Field } from '@/types';
import { db } from '@/db/database';

interface FieldState {
  fields: Field[];
  loading: boolean;
  loadFields: () => Promise<void>;
  addField: (field: Field) => Promise<void>;
  updateField: (id: number, field: Partial<Field>) => Promise<void>;
  deleteField: (id: number) => Promise<void>;
  getFieldById: (id: number) => Field | undefined;
}

export const useFieldStore = create<FieldState>((set, get) => ({
  fields: [],
  loading: false,
  loadFields: async () => {
    set({ loading: true });
    const fields = await db.fields.toArray();
    set({ fields, loading: false });
  },
  addField: async (field) => {
    const id = await db.fields.add(field);
    set((state) => ({ fields: [...state.fields, { ...field, id }] }));
  },
  updateField: async (id, field) => {
    await db.fields.update(id, field);
    set((state) => ({
      fields: state.fields.map(f => f.id === id ? { ...f, ...field } : f)
    }));
  },
  deleteField: async (id) => {
    await db.fields.delete(id);
    set((state) => ({ fields: state.fields.filter(f => f.id !== id) }));
  },
  getFieldById: (id) => {
    return get().fields.find(f => f.id === id);
  }
}));
`,

  'src/stores/scanStore.ts': `import { create } from 'zustand';
import { Scan } from '@/types';
import { db } from '@/db/database';

interface ScanState {
  scans: Scan[];
  loading: boolean;
  loadScans: () => Promise<void>;
  addScan: (scan: Scan) => Promise<void>;
  getScanById: (id: number) => Scan | undefined;
  getRecentScans: (limit?: number) => Scan[];
  getScansByField: (fieldId: number) => Scan[];
}

export const useScanStore = create<ScanState>((set, get) => ({
  scans: [],
  loading: false,
  loadScans: async () => {
    set({ loading: true });
    const scans = await db.scans.orderBy('date').reverse().toArray();
    set({ scans, loading: false });
  },
  addScan: async (scan) => {
    const id = await db.scans.add(scan);
    set((state) => {
      const newScans = [{ ...scan, id }, ...state.scans];
      return { scans: newScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
    });
  },
  getScanById: (id) => get().scans.find(s => s.id === id),
  getRecentScans: (limit = 5) => get().scans.slice(0, limit),
  getScansByField: (fieldId) => get().scans.filter(s => s.fieldId === fieldId)
}));
`,

  'src/stores/weatherStore.ts': `import { create } from 'zustand';
import { WeatherData, WeatherForecast } from '@/types';
import { db } from '@/db/database';

interface WeatherState {
  weather: WeatherData | null;
  forecast: WeatherForecast[];
  loading: boolean;
  isOffline: boolean;
  loadWeather: () => Promise<void>;
  updateWeather: (data: WeatherData) => Promise<void>;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  forecast: [],
  loading: false,
  isOffline: false,
  loadWeather: async () => {
    set({ loading: true });
    const records = await db.weather.toArray();
    if (records.length > 0) {
      set({ weather: records[0], isOffline: records[0].isOffline, loading: false });
    } else {
      set({ loading: false });
    }
  },
  updateWeather: async (data) => {
    await db.weather.clear();
    await db.weather.add(data);
    set({ weather: data, isOffline: data.isOffline });
  }
}));
`,

  'src/stores/settingsStore.ts': `import { create } from 'zustand';
import { AppSettings } from '@/types';
import { db } from '@/db/database';

interface SettingsState {
  settings: AppSettings | null;
  language: string;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  setLanguage: (lang: AppSettings['language']) => Promise<void>;
}

const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'light',
  notifications: true,
  autoSync: true,
  imageQuality: 'medium',
  offlineMode: false
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  language: 'en',
  loading: false,
  loadSettings: async () => {
    set({ loading: true });
    const records = await db.settings.toArray();
    let current = records[0];
    if (!current) {
      const id = await db.settings.add(defaultSettings);
      current = { ...defaultSettings, id };
    }
    set({ settings: current, language: current.language, loading: false });
  },
  updateSettings: async (updates) => {
    const current = get().settings;
    if (current && current.id) {
      await db.settings.update(current.id, updates);
      set({ settings: { ...current, ...updates } });
    }
  },
  setLanguage: async (lang) => {
    const current = get().settings;
    if (current && current.id) {
      await db.settings.update(current.id, { language: lang });
      set({ language: lang, settings: { ...current, language: lang } });
    }
  }
}));
`,

  'src/stores/syncStore.ts': `import { create } from 'zustand';
import { SyncItem } from '@/types';
import { db } from '@/db/database';

interface SyncState {
  queue: SyncItem[];
  pendingCount: number;
  loading: boolean;
  loadQueue: () => Promise<void>;
  addToQueue: (item: Omit<SyncItem, 'id' | 'createdAt' | 'retryCount' | 'status'>) => Promise<void>;
  processQueue: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  queue: [],
  pendingCount: 0,
  loading: false,
  loadQueue: async () => {
    set({ loading: true });
    const queue = await db.syncQueue.toArray();
    const pendingCount = queue.filter(q => q.status === 'pending').length;
    set({ queue, pendingCount, loading: false });
  },
  addToQueue: async (item) => {
    const fullItem: SyncItem = {
      ...item,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };
    await db.syncQueue.add(fullItem);
    await get().loadQueue();
  },
  processQueue: async () => {
    // In a real app, this would process API calls
    const queue = await db.syncQueue.where('status').equals('pending').toArray();
    for (const item of queue) {
      if (item.id) {
        await db.syncQueue.update(item.id, { status: 'synced' });
      }
    }
    await get().loadQueue();
  },
  retryFailed: async () => {
    const queue = await db.syncQueue.where('status').equals('failed').toArray();
    for (const item of queue) {
      if (item.id) {
        await db.syncQueue.update(item.id, { status: 'pending', retryCount: item.retryCount + 1 });
      }
    }
    await get().processQueue();
  }
}));
`,

  'src/stores/notificationStore.ts': `import { create } from 'zustand';
import { AppNotification } from '@/types';
import { db } from '@/db/database';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'isRead'>) => Promise<void>;
  markRead: (id: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loadNotifications: async () => {
    set({ loading: true });
    const notifications = await db.notifications.orderBy('date').reverse().toArray();
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount, loading: false });
  },
  addNotification: async (notif) => {
    const fullNotif: AppNotification = { ...notif, isRead: false };
    await db.notifications.add(fullNotif);
    await get().loadNotifications();
  },
  markRead: async (id) => {
    await db.notifications.update(id, { isRead: true });
    await get().loadNotifications();
  }
}));
`,

  'src/db/seedData.ts': `import { subDays } from 'date-fns';
import { db } from './database';
import { 
  User, Field, Scan, WeatherData, GrowthRecord, 
  Advisory, AppNotification, AppSettings 
} from '@/types';

export const seedDatabase = async () => {
  const userCount = await db.users.count();
  if (userCount > 0) return; // Already seeded

  const demoUser: User = {
    name: 'Ramesh',
    phone: '+91 98765 43210',
    email: 'ramesh@example.com',
    location: 'Thanjavur',
    state: 'Tamil Nadu, India',
    language: 'en',
    isDemo: true
  };
  await db.users.add(demoUser);

  const fields: Field[] = [
    {
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
      type: 'disease_detected',
      title: 'High Risk Alert',
      message: 'Leaf Blast detected in East Paddy field. Immediate action required.',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 1).toISOString(),
      isRead: false
    },
    {
      type: 'weather_risk',
      title: 'Heavy Rain Forecast',
      message: 'High humidity expected tomorrow. Good condition for fungal growth.',
      date: subDays(new Date('2026-08-20T11:08:13+05:30'), 2).toISOString(),
      isRead: true
    }
  ];
  await db.notifications.bulkAdd(notifications);

  const settings: AppSettings = {
    language: 'en',
    theme: 'light',
    notifications: true,
    autoSync: true,
    imageQuality: 'medium',
    offlineMode: false
  };
  await db.settings.add(settings);

  console.log('Database seeded successfully');
};
`
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(projectDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log(\`Created \${fullPath}\`);
}
