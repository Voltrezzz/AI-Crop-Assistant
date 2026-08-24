import { create } from 'zustand';
import { AppSettings } from '@/types';
import { db } from '@/db/database';
import { useAuthStore } from './authStore';

interface SettingsState {
  settings: AppSettings | null;
  language: AppSettings['language'];
  theme: AppSettings['theme'];
  loading: boolean;
  initializeTheme: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  setLanguage: (lang: AppSettings['language']) => void;
  reset: () => void;
}

function applyTheme(theme: AppSettings['theme']) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('theme', theme);
}

function getStoredTheme(): AppSettings['theme'] {
  return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
}

const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'light',
  notifications: true,
  autoSync: true,
  imageQuality: 'medium',
  offlineMode: false
};

// Invalidates older async settings reads when a newer load or user update wins.
let settingsOperation = 0;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  language: 'en',
  theme: getStoredTheme(),
  loading: false,
  initializeTheme: () => applyTheme(get().theme),
  loadSettings: async () => {
    const operation = ++settingsOperation;
    set({ loading: true });
    const user = useAuthStore.getState().user;
    if (user && user.id) {
      const records = await db.settings.where('userId').equals(user.id).toArray();
      let current = records[0];
      if (!current) {
        const id = await db.settings.add({ ...defaultSettings, userId: user.id });
        current = { ...defaultSettings, id, userId: user.id };
      }
      if (operation !== settingsOperation) return;
      localStorage.setItem('language', current.language);
      const theme = current.theme === 'dark' ? 'dark' : 'light';
      applyTheme(theme);
      set({ settings: { ...current, theme }, language: current.language, theme, loading: false });
    } else {
      if (operation !== settingsOperation) return;
      set({ settings: null, language: 'en', loading: false });
    }
  },
  updateSettings: async (updates) => {
    const current = get().settings;
    if (current && current.id) {
      const operation = ++settingsOperation;
      if (updates.theme) {
        applyTheme(updates.theme);
        set({ theme: updates.theme, settings: { ...current, ...updates }, loading: false });
      }
      await db.settings.update(current.id, updates);
      if (operation !== settingsOperation) return;
      set({ settings: { ...current, ...updates } });
      if (updates.language) {
        localStorage.setItem('language', updates.language);
        set({ language: updates.language });
      }
      if (updates.autoSync === true) {
        const user = useAuthStore.getState().user;
        if (user?.id && !user.isDemo) {
          void import('@/services/cloudSyncService').then(async ({ hydrateCloudData, processPendingCloudChanges }) => {
            await hydrateCloudData(user.id!);
            await processPendingCloudChanges(user.id!);
          }).catch(error => console.error('Cloud sync could not start:', error));
        }
      }
    }
  },
  setLanguage: (lang) => {
    settingsOperation += 1;
    const current = get().settings;
    localStorage.setItem('language', lang);
    if (current && current.id) {
      db.settings.update(current.id, { language: lang });
      set({ language: lang, settings: { ...current, language: lang }, loading: false });
    } else {
      set({ language: lang, loading: false });
    }
  },
  reset: () => {
    settingsOperation += 1;
    set({ settings: null, language: 'en', loading: false });
  }
}));
