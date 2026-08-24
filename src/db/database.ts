import Dexie, { Table } from 'dexie';

import {
  User,
  Profile,
  Field,
  CropCycle,
  Scan,
  GrowthRecord,
  WeatherData,
  Advisory,
  AppNotification,
  AppSettings,
  SyncItem,
  ModelMetadata,
  IrrigationRecord,
  LandParcel,
  Animal,
  VaccinationRecord,
  AnimalHealthRecord,
  Loan,
  GovernmentScheme,
  FertilizerShop,
  MarketPrice,
  HarvestAnalysis,
  InsectBiteScan,
  PestAdvisoryRecord,
  ChatMessage,
  DocumentFile,
} from '@/types';

export class CropSenseDatabase extends Dexie {
  users!: Table<User, number>;
  profiles!: Table<Profile, number>;

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

  irrigationRecords!: Table<IrrigationRecord, number>;
  landParcels!: Table<LandParcel, number>;
  animals!: Table<Animal, number>;
  vaccinations!: Table<VaccinationRecord, number>;
  animalHealth!: Table<AnimalHealthRecord, number>;
  loans!: Table<Loan, number>;
  governmentSchemes!: Table<GovernmentScheme, number>;
  fertilizerShops!: Table<FertilizerShop, number>;
  marketPrices!: Table<MarketPrice, number>;
  harvestAnalysis!: Table<HarvestAnalysis, number>;
  insectBiteScans!: Table<InsectBiteScan, number>;
  pestAdvisories!: Table<PestAdvisoryRecord, number>;
  chatMessages!: Table<ChatMessage, number>;
  documents!: Table<DocumentFile, number>;

  constructor() {
    super('CropSenseDB');

    // Version 1
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
      modelMetadata: '++id, modelName',
    });

    // Version 2
    this.version(2).stores({
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
      modelMetadata: '++id, modelName',

      irrigationRecords: '++id, fieldId, cropType, date',
      landParcels: '++id, name, crop, status',
      animals: '++id, name, type, tagNumber, healthStatus',
      vaccinations: '++id, animalId, vaccineName, status, nextDueDate',
      animalHealth: '++id, animalId, date, status',
      loans: '++id, loanType, bankName, status, nextPaymentDate',
      governmentSchemes: '++id, schemeName, category, isApplied',
      fertilizerShops: '++id, name, city, type',
      marketPrices: '++id, crop, marketType, date, state',
      harvestAnalysis: '++id, fieldId, crop, stage, harvestDate',
      insectBiteScans: '++id, insectType, severity, date',
      chatMessages: '++id, role, timestamp, category',
    });

    // Version 3 - current schema
    this.version(3).stores({
      users: '++id, name, email, phone, password',

      // FIX: profiles was declared but never registered
      profiles: '++id, userId, name, type',

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
      modelMetadata: '++id, modelName',

      irrigationRecords: '++id, fieldId, cropType, date',
      landParcels: '++id, name, crop, status',
      animals: '++id, name, type, tagNumber, healthStatus',
      vaccinations: '++id, animalId, vaccineName, status, nextDueDate',
      animalHealth: '++id, animalId, date, status',
      loans: '++id, loanType, bankName, status, nextPaymentDate',
      governmentSchemes: '++id, schemeName, category, isApplied',
      fertilizerShops: '++id, name, city, type',
      marketPrices: '++id, crop, marketType, date, state',

      harvestAnalysis: '++id, crop, stage',
      insectBiteScans: '++id, date',
      chatMessages: '++id, timestamp, role',
      documents: '++id, name, type, date',
    });

    // Version 4 - Add userId for user data isolation
    this.version(4).stores({
      users: '++id, name, email, phone, password',
      profiles: '++id, userId, name, type',

      // User-specific tables with userId
      fields: '++id, userId, name, crop, status',
      cropCycles: '++id, userId, fieldId, crop, status',
      scans: '++id, userId, fieldId, crop, disease, date, syncStatus',
      growthRecords: '++id, userId, fieldId, date',
      advisories: '++id, userId, type, date, isRead',
      notifications: '++id, userId, type, date, isRead',
      settings: '++id, userId',
      
      // Global/shared tables
      weather: '++id, location, updatedAt',
      recommendations: '++id, disease',
      syncQueue: '++id, userId, entity, status',
      modelMetadata: '++id, modelName',

      // User-specific feature tables with userId
      irrigationRecords: '++id, userId, fieldId, cropType, date',
      landParcels: '++id, userId, name, crop, status',
      animals: '++id, userId, name, type, tagNumber, healthStatus',
      vaccinations: '++id, userId, animalId, vaccineName, status, nextDueDate',
      animalHealth: '++id, userId, animalId, date, status',
      loans: '++id, userId, loanType, bankName, status, nextPaymentDate',
      governmentSchemes: '++id, userId, schemeName, category, isApplied',
      
      // Global reference data
      fertilizerShops: '++id, name, city, type',
      marketPrices: '++id, crop, marketType, date, state',

      // User-specific feature tables with userId
      harvestAnalysis: '++id, userId, crop, stage',
      insectBiteScans: '++id, userId, date',
      chatMessages: '++id, userId, timestamp, role',
      documents: '++id, userId, name, type, date',
    }).upgrade(async (trans) => {
      // Migration: Assign existing data to demo user
      const users = await trans.table('users').toArray();
      const demoUser = users.find(u => u.isDemo) || users[0];
      
      if (demoUser && demoUser.id) {
        // Update all existing records to belong to demo user
        const tablesToUpdate = [
          'fields', 'cropCycles', 'scans', 'growthRecords', 
          'advisories', 'notifications', 'settings', 'syncQueue',
          'irrigationRecords', 'landParcels', 'animals', 
          'vaccinations', 'animalHealth', 'loans', 'governmentSchemes',
          'harvestAnalysis', 'insectBiteScans', 'chatMessages', 'documents'
        ];
        
        for (const tableName of tablesToUpdate) {
          const table = trans.table(tableName);
          const records = await table.toArray();
          for (const record of records) {
            if (!record.userId) {
              await table.update(record.id!, { userId: demoUser.id });
            }
          }
        }
      }
    });

    // Version 5 - Link the local user cache to Supabase Auth.
    this.version(5).stores({
      users: '++id, &email, cloudId, name, phone',
    });

    // Version 6 - Stable cloud identities, fraction-based scan confidence,
    // and removal of legacy plaintext password fields.
    this.version(6).stores({
      users: '++id, &email, cloudId, name, phone',
      profiles: '++id, userId, cloudId, name, type',
      fields: '++id, userId, cloudId, name, crop, status',
      scans: '++id, userId, cloudId, fieldId, fieldCloudId, crop, disease, date, syncStatus',
      chatMessages: '++id, userId, cloudId, timestamp, role',
    }).upgrade(async (trans) => {
      await trans.table('users').toCollection().modify((user) => {
        delete user.password;
      });
      await trans.table('scans').toCollection().modify((scan) => {
        if (typeof scan.confidence === 'number' && scan.confidence > 1) {
          scan.confidence = Math.min(scan.confidence / 100, 1);
        }
      });
    });

    // Version 7 - User-scoped history for real Gemini pest advisories.
    // Legacy prototype insectBiteScans are retained but no longer used by the UI.
    this.version(7).stores({
      pestAdvisories: '++id, userId, date, selectedCrop, confidence',
    });
  }
}

export const db = new CropSenseDatabase();
