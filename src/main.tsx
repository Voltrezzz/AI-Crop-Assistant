import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useSettingsStore } from './stores/settingsStore';

// The settings store is the single theme source and applies it before first paint.
useSettingsStore.getState().initializeTheme();

async function bootstrap() {
  try {
    const seed = await import('./db/seedData');
    await seed.seedDatabase();
  } catch (error) {
    console.error('Local database initialization failed:', error);
  }

  const auth = await import('./stores/authStore');
  await auth.useAuthStore.getState().initializeAuth();

  // Both functions respect the persisted Auto-Sync preference.
  window.addEventListener('online', () => {
    void import('./services/cloudSyncService').then(async (cloud) => {
      const user = auth.useAuthStore.getState().user;
      if (!user?.id || user.isDemo) return;
      await cloud.hydrateCloudData(user.id);
      await cloud.processPendingCloudChanges(user.id);
    }).catch(error => console.error('Cloud sync retry failed:', error));
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
