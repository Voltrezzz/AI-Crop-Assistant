import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Check, Globe2 } from 'lucide-react';
import { db } from '@/db/database';
import { SUPPORTED_LANGUAGES } from '@/hooks/useTranslation';
import { SupportedLanguage } from '@/types';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, activeProfile } = useAuthStore();
  const { language, setLanguage } = useSettingsStore();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language || 'en');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleFinish = async () => {
    setLanguage(selectedLang);
    if (activeProfile && activeProfile.id) {
      await db.profiles.update(activeProfile.id, { language: selectedLang });
    } else if (user && user.id) {
      // If no active profile, update the first profile for this user
      const profiles = await db.profiles.where('userId').equals(user.id).toArray();
      if (profiles.length > 0) {
        await db.profiles.update(profiles[0].id!, { language: selectedLang });
      }
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-green-600 p-8 text-center">
          <Globe2 className="w-16 h-16 text-white mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold text-white">Welcome, {activeProfile?.name || user?.name}!</h1>
          <p className="text-green-100 mt-2">Let's set up your preferred language</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Select Language</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                  selectedLang === lang.code 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-green-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span className="font-bold text-lg">{lang.nativeName}</span>
                <span className="text-sm opacity-80">{lang.name}</span>
                {selectedLang === lang.code && (
                  <Check className="absolute top-2 right-2 text-green-500" size={16} />
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleFinish}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all"
            >
              Start Farming
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
