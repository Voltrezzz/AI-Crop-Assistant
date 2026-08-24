import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Wifi, Moon, Sun, LogOut, Globe } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { SUPPORTED_LANGUAGES, useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';
import { AppSettings } from '@/types';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { settings, language, theme, updateSettings, setLanguage } = useSettingsStore();
  const { t } = useTranslation();

  const updateSetting = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
    if (key === 'language') {
      setLanguage(value as AppSettings['language']);
      return;
    }
    updateSettings({ [key]: value } as Partial<AppSettings>);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-100 font-sans pb-20 dark:bg-slate-950">
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-neutral-200 dark:border-slate-700 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-neutral-100 rounded-full text-neutral-600">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-bold text-lg text-neutral-900 dark:text-slate-100">{t('general.settings')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {user && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-neutral-200">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-neutral-900 truncate">{user.name}</h2>
              <p className="text-sm text-neutral-500 truncate">{user.phone}</p>
              {user.isDemo && (
                <span className="inline-block mt-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">Demo Mode</span>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden mb-6">
          <div className="bg-neutral-50 p-4 border-b border-neutral-100">
            <h2 className="font-semibold text-neutral-800">App Preferences</h2>
          </div>
          <div className="divide-y divide-neutral-100">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-neutral-500" />
                <span className="font-medium text-neutral-900 dark:text-slate-100">{t('general.language')}</span>
              </div>
              <select 
                value={language}
                onChange={(e) => updateSetting('language', e.target.value as AppSettings['language'])}
                className="bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-sm"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark'
                  ? <Moon className="h-5 w-5 text-indigo-400" />
                  : <Sun className="h-5 w-5 text-amber-500" />}
                <div>
                  <span className="block font-medium text-neutral-900 dark:text-slate-100">Dark mode</span>
                  <span className="block text-xs text-neutral-500 dark:text-slate-400">Use a darker theme throughout the app</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={() => updateSetting('theme', theme === 'dark' ? 'light' : 'dark')}
                className={`relative h-7 w-12 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-600' : 'bg-neutral-300'}`}
                aria-label="Toggle dark mode"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-neutral-500" />
                <span className="font-medium text-neutral-900 dark:text-slate-100">{t('general.notifications')}</span>
              </div>
              <input type="checkbox" checked={settings?.notifications ?? true} onChange={(e) => updateSetting('notifications', e.target.checked)} className="h-5 w-5 text-green-600 rounded" />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-neutral-500" />
                <span className="font-medium text-neutral-900">Auto-Sync</span>
              </div>
              <input type="checkbox" checked={settings?.autoSync ?? true} onChange={(e) => updateSetting('autoSync', e.target.checked)} className="h-5 w-5 text-green-600 rounded" />
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center justify-center gap-2 text-red-600 font-bold hover:bg-red-50">
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </main>
    </div>
  );
}
