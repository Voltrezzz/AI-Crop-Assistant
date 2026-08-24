# 🌾 Marudham 360

**AI-powered crop health analysis and protection — even without internet.**

> _"Analyze. Protect. Grow."_

Marudham 360 is an offline-first Progressive Web Application (PWA) designed for Indian farmers to analyze paddy and wheat crop health using AI-powered image analysis. It provides disease detection, severity assessment, treatment recommendations, weather-aware advisories, and field management — all working without an internet connection.

---

## ✨ Features

### 🔬 AI Crop Analysis
- Upload or capture leaf images for instant analysis
- Deterministic prototype AI inference (ready for TensorFlow.js integration)
- Disease detection with confidence scoring and severity assessment
- Supports **8 disease classes** across Paddy and Wheat

### 🌿 Supported Crops & Diseases

| Paddy | Wheat |
|-------|-------|
| ✅ Healthy | ✅ Healthy |
| 🔴 Brown Spot | 🔴 Leaf Rust |
| 🔴 Leaf Blast | 🔴 Stripe Rust |
| 🔴 Bacterial Leaf Blight | 🔴 Powdery Mildew |

### 📱 Offline-First PWA
- Core features work without internet
- IndexedDB local storage for all data
- Automatic sync when connectivity returns
- Installable as a native-like app

### 🗺️ Field Management
- Track multiple fields with crop details
- Monitor growth stages and health scores
- Per-field disease risk assessment

### 📊 Dashboard & Analytics
- Dynamic statistics from local data
- Health trend charts
- Disease severity tracking
- Weather-aware risk assessment

### 🌐 Multi-Language Support
- English
- हिन्दी (Hindi)
- తెలుగు (Telugu)

### 🎙️ Voice Assistant
- Voice commands via Web Speech API
- Navigate the app hands-free
- Fallback button interface when speech is unavailable

### 📄 PDF Reports
- Generate crop health reports
- Include scan results, recommendations, and field details
- Download as PDF

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| Routing | React Router 6 |
| State | Zustand |
| Database | Dexie.js (IndexedDB) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |
| Reports | jsPDF |
| AI (future) | TensorFlow.js |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
cd cropsense-ai
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🧑‍🌾 Demo Mode

The app works immediately without any backend or API keys.

1. Open the app
2. Click **"Continue as Demo Farmer"** on the login page
3. You'll be logged in as **Ramesh** from **Tamil Nadu, India**
4. The dashboard shows pre-populated fields and scan history

### Demo Farmer
- **Name:** Ramesh
- **Location:** Thanjavur, Tamil Nadu, India
- **Fields:** 4 (2 Paddy + 2 Wheat)
- **Historical Scans:** Pre-populated with realistic data

---

## 🔧 Environment Variables

Create a `.env` file (optional):

```env
VITE_WEATHER_API_KEY=       # OpenWeatherMap API key (optional)
VITE_API_BASE_URL=          # Backend API URL (optional)
```

> The app runs fully without these variables using demo/cached data.

---

## 📁 Project Structure

```
cropsense-ai/
├── public/
│   └── icons/              # PWA icons
├── src/
│   ├── ai/                 # AI service layer
│   │   ├── aiService.ts    # Main AI service interface
│   │   ├── demoInference.ts # Deterministic demo AI model
│   │   ├── modelLoader.ts  # Model loading abstraction
│   │   ├── imagePreprocessor.ts # Image quality checks
│   │   ├── confidence.ts   # Confidence utilities
│   │   └── severity.ts     # Severity calculations
│   ├── components/         # Reusable UI components
│   ├── db/
│   │   ├── database.ts     # Dexie.js IndexedDB setup
│   │   └── seedData.ts     # Demo data initialization
│   ├── hooks/
│   │   └── useTranslation.ts # i18n hook
│   ├── layouts/
│   │   └── AppShell.tsx    # Main layout with sidebar + mobile nav
│   ├── locales/
│   │   ├── en.json         # English translations
│   │   ├── hi.json         # Hindi translations
│   │   └── te.json         # Telugu translations
│   ├── pages/              # All page components (19 pages)
│   ├── services/
│   │   ├── diseaseDatabase.ts # Disease knowledge base
│   │   ├── healthScoreService.ts # Health score calculation
│   │   ├── recommendationService.ts # Treatment recommendations
│   │   └── riskEngine.ts   # Disease risk assessment
│   ├── stores/             # Zustand state stores
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   └── utils/
│       └── index.ts        # Utility functions
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🤖 AI Architecture

The AI system is designed with a clean abstraction layer:

```typescript
interface CropAIModel {
  load(): Promise<void>;
  predict(imageData: string, crop: CropType, scenario?: string): Promise<Prediction>;
}
```

### Current: Demo Model
- `DemoCropAIModel` provides deterministic predictions
- Results are based on selected scenario (not random)
- Developer controls allow selecting specific disease scenarios

### Future: TensorFlow.js Model
- Replace `DemoCropAIModel` with `TensorFlowCropAIModel`
- The model file goes in `public/models/`
- No UI changes required — the abstraction handles it

### Where to integrate a real model:
1. Create `src/ai/tensorflowModel.ts` implementing `CropAIModel`
2. Update `src/ai/modelLoader.ts` to load the TF.js model
3. Place the model files in `public/models/`

---

## 💾 Database Schema

IndexedDB tables via Dexie.js:

| Table | Purpose |
|-------|---------|
| `users` | Farmer profiles |
| `fields` | Field management data |
| `cropCycles` | Crop cycle tracking |
| `scans` | AI analysis results |
| `growthRecords` | Growth stage records |
| `weather` | Cached weather data |
| `advisories` | Agricultural advisories |
| `notifications` | In-app notifications |
| `settings` | App settings |
| `syncQueue` | Offline sync queue |
| `modelMetadata` | AI model versions |

---

## 📱 PWA Installation

1. Open the app in Chrome/Edge
2. Click the install prompt or use the browser's install option
3. The app installs as a standalone application
4. Works offline after first load

---

## 🌐 Offline Mode

When offline, these features continue working:
- ✅ Dashboard with cached data
- ✅ AI crop analysis (demo inference)
- ✅ Scan results and recommendations
- ✅ Field management
- ✅ Crop history
- ✅ Growth monitoring
- ✅ Disease risk calculation
- ✅ PDF report generation
- ✅ Language switching
- ✅ Voice commands (browser-dependent)
- ✅ Cached weather data

When online again:
- 🔄 Pending scans sync automatically
- 🔄 Weather data refreshes
- 🔄 Sync status indicator updates

---

## 🗺️ Application Routes

| Route | Page |
|-------|------|
| `/` | Landing Page |
| `/login` | Login |
| `/dashboard` | Farmer Dashboard |
| `/analyzer` | AI Crop Analyzer |
| `/analyzer/result/:id` | Analysis Result |
| `/history` | Crop History |
| `/history/:id` | Scan Details |
| `/fields` | My Fields |
| `/fields/new` | Add Field |
| `/fields/:id` | Field Details |
| `/fields/:id/progress` | Growth Progress |
| `/growth` | Growth Monitoring |
| `/weather` | Weather |
| `/risk` | Disease Risk |
| `/advisories` | Advisories |
| `/voice` | Voice Assistant |
| `/reports` | Reports |
| `/notifications` | Notifications |
| `/settings` | Settings |
| `/admin` | Admin Dashboard |

---

## ⚠️ Known Prototype Limitations

1. **AI Model:** Uses deterministic demo inference, not a trained ML model
2. **Weather:** Uses demo data when no API key is configured
3. **Authentication:** Simplified demo login, no real auth backend
4. **Sync:** Sync queue is local-only; no actual server synchronization
5. **Voice:** Depends on browser Web Speech API support
6. **Camera:** Depends on browser camera permissions
7. **PWA icons:** SVG-based (should be PNG for production)

---

## 🚀 Deployment

### Vercel
```bash
npm run build
# Deploy the `dist/` folder
```

### Netlify
```bash
npm run build
# Point to `dist/` as publish directory
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
```

---

## 📜 License

This is a prototype built for demonstration purposes.

---

Built with 💚 for Indian farmers
