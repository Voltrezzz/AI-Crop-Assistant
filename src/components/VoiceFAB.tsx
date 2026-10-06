import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function VoiceFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Hide on pages where voice isn't applicable or is already prominent
  const hidePaths = ['/login', '/', '/onboarding', '/profiles', '/voice'];
  if (hidePaths.includes(location.pathname)) {
    return null;
  }

  return (
    <button
      onClick={() => navigate('/voice')}
      className="fixed bottom-24 lg:bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-xl shadow-emerald-900/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      aria-label={t('nav.voiceAssistant') || "Voice Assistant"}
    >
      <Mic className="w-7 h-7" />
    </button>
  );
}
