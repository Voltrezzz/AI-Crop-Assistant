export const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
  ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN', od: 'or-IN',
};

export function getSpeechLocale(language: string): string {
  if (SPEECH_LOCALES[language]) return SPEECH_LOCALES[language];
  // Preserve valid caller-supplied BCP-47 tags rather than forcing English.
  if (/^[a-z]{2,3}-[A-Z]{2}$/.test(language)) return language;
  return SPEECH_LOCALES.en;
}

export const speakText = (text: string, language = 'en') => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLocale(language);
  const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase() === utterance.lang.toLowerCase());
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};
