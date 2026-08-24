import { useEffect, useCallback } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ta from '../locales/ta.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import mr from '../locales/mr.json';
import bn from '../locales/bn.json';
import gu from '../locales/gu.json';
import pa from '../locales/pa.json';
import or from '../locales/or.json';
import { SupportedLanguage } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';

const translations: Record<string, any> = { en, hi, te, ta, kn, ml, mr, bn, gu, pa, or };

export type Language = SupportedLanguage;

export const SUPPORTED_LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
];

export const useTranslation = () => {
  const storeLanguage = useSettingsStore((state) => state.language as Language);
  const setStoreLanguage = useSettingsStore((state) => state.setLanguage);
  const language = storeLanguage;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setStoreLanguage(lang);
  }, [setStoreLanguage]);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    
    // Attempt to find translation in current language
    let current: any = translations[language];
    for (const k of keys) {
      if (current === undefined || current === null) break;
      current = current[k];
    }
    
    if (typeof current === 'string') return current;

    // Fallback to English
    let fallback: any = translations.en;
    for (const k of keys) {
      if (fallback === undefined || fallback === null) break;
      fallback = fallback[k];
    }

    if (typeof fallback === 'string') return fallback;

    // Ultimate fallback is the key itself
    return key;
  }, [language]);

  return { t, language, setLanguage };
};
