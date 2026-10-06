export const VOICE_COMMANDS = [
  { text: 'Show crop health', tamil: 'பயிர் நலன் காட்டு', path: '/dashboard', icon: '🌱' },
  { text: 'Scan my crop', tamil: 'என் பயிரை ஸ்கேன் செய்', path: '/analyzer', icon: '📷' },
  { text: 'Show weather', tamil: 'வானிலை காட்டு', path: '/weather', icon: '🌤️' },
  { text: 'Check disease risk', tamil: 'நோய் அபாயம் காட்டு', path: '/risk', icon: '⚠️' },
  { text: 'Show my fields', tamil: 'என் வயல்கள் காட்டு', path: '/fields', icon: '🗺️' },
  { text: 'Open chat', tamil: 'அரட்டை திற', path: '/chatbot', icon: '💬' },
  { text: 'Calculate water', tamil: 'தண்ணீர் கணக்கிடு', path: '/irrigation', icon: '💧' },
  { text: 'Show my animals', tamil: 'என் கால்நடைகள் காட்டு', path: '/animals', icon: '🐄' },
  { text: 'Check loans', tamil: 'கடன்கள் காட்டு', path: '/loans', icon: '💰' },
  { text: 'Find fertilizer shop', tamil: 'உரக்கடை காட்டு', path: '/shops', icon: '🏪' },
  { text: 'Market prices', tamil: 'சந்தை விலை காட்டு', path: '/market', icon: '📈' },
  { text: 'Insect bite', tamil: 'பூச்சி ஆலோசனை', path: '/insect-bite', icon: '🐜' },
  { text: 'Show farm overview', tamil: 'பண்ணை காட்டு', path: '/land', icon: '🚜' },
  { text: 'Generate report', tamil: 'அறிக்கை உருவாக்கு', path: '/reports', icon: '📊' },
  { text: 'Open crop planning', tamil: 'பயிர் திட்டம் திற', path: '/crop-plan', icon: '🌱' },
  { text: 'Open farm memory', tamil: 'பண்ணை நினைவகம் திற', path: '/farm-memory', icon: '🌾' },
  { text: 'Open document locker', tamil: 'ஆவண பெட்டகம் திற', path: '/documents', icon: '📁' },
  { text: 'Open harvest', tamil: 'அறுவடை திற', path: '/post-harvest', icon: '📦' },
  { text: 'Open marketplace', tamil: 'தொழிலாளர் சந்தை திற', path: '/marketplace', icon: '🚜' },
  { text: 'Open community', tamil: 'சமூகம் திற', path: '/community', icon: '🤝' },
  { text: 'Open satellite monitoring', tamil: 'செயற்கைக்கோள் கண்காணிப்பு திற', path: '/satellite', icon: '🛰️' },
  { text: 'Open rural enterprise', tamil: 'கிராம தொழில் திற', path: '/livelihood', icon: '♻️' },
];

export function matchVoiceCommand(text: string) {
  const normalized = text.normalize('NFKC').toLowerCase().replace(/[.,!?]/g, '').trim();
  return VOICE_COMMANDS.find(cmd => normalized.includes(cmd.text.toLowerCase()) || normalized.includes(cmd.tamil))
    || (['water', 'irrigation'].some(word => normalized === word) ? VOICE_COMMANDS.find(cmd => cmd.path === '/irrigation') : undefined);
}
