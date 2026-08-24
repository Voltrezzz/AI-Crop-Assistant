import { create } from 'zustand';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { User, Profile } from '@/types';
import { db } from '@/db/database';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabaseClient';
import { hydrateCloudData, processPendingCloudChanges, queueCloudChange } from '@/services/cloudSyncService';

function reportSupabaseError(operation: string, error: unknown) {
  if (!import.meta.env.DEV || !error || typeof error !== 'object') return;
  const value = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
  };
  console.error(`[CropSense] Supabase ${operation} failed`, {
    code: value.code,
    message: value.message,
    details: value.details,
    hint: value.hint,
    status: value.status,
  });
}

async function resetUserScopedRuntimeState() {
  const [fieldStore, scanStore, notificationStore, settingsStore] = await Promise.all([
    import('./fieldStore'),
    import('./scanStore'),
    import('./notificationStore'),
    import('./settingsStore'),
  ]);
  fieldStore.useFieldStore.getState().reset();
  scanStore.useScanStore.getState().reset();
  notificationStore.useNotificationStore.getState().reset();
  settingsStore.useSettingsStore.getState().reset();
}

async function cacheSupabaseUser(cloudUser: SupabaseUser): Promise<User> {
  const email = cloudUser.email || '';
  let user = await db.users.where('cloudId').equals(cloudUser.id).first();
  if (!user && email) user = await db.users.where('email').equals(email).first();

  const cachedValues = {
    cloudId: cloudUser.id,
    email,
    name: String(cloudUser.user_metadata?.name || user?.name || email.split('@')[0] || 'Farmer'),
    phone: user?.phone || '',
    location: user?.location || '',
    state: user?.state || '',
    language: user?.language || 'en' as const,
    isDemo: false,
    joinDate: user?.joinDate || cloudUser.created_at || new Date().toISOString(),
  };

  if (user?.id) {
    await db.users.update(user.id, cachedValues);
    return { ...user, ...cachedValues };
  }

  const id = await db.users.add(cachedValues);
  return { ...cachedValues, id };
}

let authSubscription: { unsubscribe: () => void } | null = null;
let initializeAuthPromise: Promise<void> | null = null;
let restoreInFlight: Promise<void> | null = null;
let restoringCloudId: string | null = null;
let enteringDemoMode = false;

interface AuthState {
  user: User | null;
  activeProfile: Profile | null;
  profiles: Profile[];
  isLoggedIn: boolean;
  isDemo: boolean;
  initializeAuth: () => Promise<void>;
  restoreCloudUser: (cloudUser: SupabaseUser) => Promise<void>;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<User>;
  selectProfile: (profile: Profile) => void;
  addProfile: (name: string, type: 'farmer' | 'worker' | 'admin') => Promise<Profile>;
  loadProfiles: (userId: number) => Promise<void>;
  deleteProfile: (id: number) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeProfile: null,
  profiles: [],
  isLoggedIn: false,
  isDemo: false,

  initializeAuth: async () => {
    if (!isSupabaseConfigured()) return;
    if (initializeAuthPromise) return initializeAuthPromise;

    initializeAuthPromise = (async () => {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getSession();
      if (error) reportSupabaseError('getSession', error);
      if (data.session?.user) await get().restoreCloudUser(data.session.user);

      if (!authSubscription) {
        const { data: listener } = client.auth.onAuthStateChange((event, session) => {
          const skipSignedOutClear = event === 'SIGNED_OUT' && enteringDemoMode;
          window.setTimeout(() => {
            if (session?.user) {
              void get().restoreCloudUser(session.user);
            } else if (event === 'SIGNED_OUT' && !skipSignedOutClear) {
              get().clearSession();
            }
          }, 0);
        });
        authSubscription = listener.subscription;
      }
    })().catch((error) => {
      reportSupabaseError('session restoration', error);
    });

    return initializeAuthPromise;
  },

  restoreCloudUser: async (cloudUser) => {
    const current = get().user;
    if (current?.cloudId === cloudUser.id && get().isLoggedIn) return;
    if (restoreInFlight && restoringCloudId === cloudUser.id) return restoreInFlight;

    restoringCloudId = cloudUser.id;
    restoreInFlight = (async () => {
      const user = await cacheSupabaseUser(cloudUser);
      set({ user, isLoggedIn: true, isDemo: false });
      if (!user.id) return;

      try {
        await hydrateCloudData(user.id);
      } catch (error) {
        // A cached Supabase session is enough for offline access. Cloud hydration
        // can retry when connectivity returns.
        reportSupabaseError('cloud hydration', error);
      }

      let profiles = await db.profiles.where('userId').equals(user.id).toArray();
      if (!profiles.length) {
        const profile: Profile = { userId: user.id, name: user.name, type: 'farmer', language: user.language };
        profile.id = await db.profiles.add(profile);
        profiles = [profile];
        await queueCloudChange(user.id, 'profiles', 'create', profile as unknown as Record<string, unknown>);
      }
      set({ profiles, activeProfile: profiles[0] || null });
      void processPendingCloudChanges(user.id);
    })();

    try {
      await restoreInFlight;
    } finally {
      if (restoringCloudId === cloudUser.id) {
        restoringCloudId = null;
        restoreInFlight = null;
      }
    }
  },

  clearSession: () => {
    set({ user: null, activeProfile: null, profiles: [], isLoggedIn: false, isDemo: false });
    void resetUserScopedRuntimeState();
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Online account login requires Supabase. You can still use Demo mode offline.');
    }
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) reportSupabaseError('signInWithPassword', error);
    if (error || !data.user) throw new Error(error?.message || 'Cloud sign-in failed.');
    await get().restoreCloudUser(data.user);
  },

  register: async (email, name, password) => {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Online registration requires Supabase. CropSense does not store account passwords offline.');
    }

    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) reportSupabaseError('signUp', error);
    if (error || !data.user) throw new Error(error?.message || 'Cloud registration failed.');
    if (!data.session) {
      throw new Error('Account created. Check your email to confirm it, then sign in.');
    }

    await get().restoreCloudUser(data.user);
    const user = get().user;
    if (!user) throw new Error('Account created, but the local session could not be initialized.');
    return user;
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) reportSupabaseError('signOut', error);
    }
    get().clearSession();
  },

  loginAsDemo: async () => {
    if (isSupabaseConfigured()) {
      enteringDemoMode = true;
      try {
        await getSupabaseClient().auth.signOut();
      } finally {
        enteringDemoMode = false;
      }
    }
    const users = await db.users.toArray();
    let demoUser = users.find(user => user.isDemo);

    if (!demoUser) {
      const newDemoUser: User = {
        name: 'Ramesh',
        email: 'demo@cropsense.ai',
        phone: '+91 98765 43210',
        location: 'Thanjavur',
        state: 'Tamil Nadu, India',
        language: 'en',
        isDemo: true,
        joinDate: new Date().toISOString(),
      };
      newDemoUser.id = await db.users.add(newDemoUser);
      demoUser = newDemoUser;
    }

    if (!demoUser.id) throw new Error('Failed to initialize demo user');
    let profiles = await db.profiles.where('userId').equals(demoUser.id).toArray();
    if (!profiles.length) {
      const profile: Profile = { userId: demoUser.id, name: demoUser.name, type: 'farmer', language: 'en' };
      profile.id = await db.profiles.add(profile);
      profiles = [profile];
    }
    set({ user: demoUser, isLoggedIn: true, isDemo: true, profiles, activeProfile: profiles[0] });
  },

  loadProfiles: async (userId) => {
    const profiles = await db.profiles.where('userId').equals(userId).toArray();
    set({ profiles, activeProfile: profiles.length === 1 ? profiles[0] : get().activeProfile });
  },

  selectProfile: (profile) => set({ activeProfile: profile }),

  addProfile: async (name, type) => {
    const user = get().user;
    if (!user?.id) throw new Error('Not logged in');
    const profile: Profile = { userId: user.id, name, type };
    profile.id = await db.profiles.add(profile);
    if (!user.isDemo) {
      await queueCloudChange(user.id, 'profiles', 'create', profile as unknown as Record<string, unknown>);
    }
    await get().loadProfiles(user.id);
    return profile;
  },

  deleteProfile: async (id) => {
    const user = get().user;
    if (user?.id && !user.isDemo) await queueCloudChange(user.id, 'profiles', 'delete', { id });
    await db.profiles.delete(id);
    if (user?.id) await get().loadProfiles(user.id);
  },
}));
