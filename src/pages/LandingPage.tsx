import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Scan, WifiOff, History, Activity, TrendingUp, CloudSun, Languages, Mic, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <header className="bg-white sticky top-0 z-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <Leaf className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">Marudham 360</span>
          </div>
          <div>
            <button 
              onClick={() => navigate('/login')}
              className="text-green-700 font-medium px-4 py-2 hover:bg-green-50 rounded-lg transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="ml-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-green-800 to-green-600 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-green-900/50 text-green-100 px-3 py-1 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-green-700/50">
              <ShieldCheck className="h-4 w-4" />
              <span>Offline-First Technology</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              AI-powered crop health analysis and protection
              <span className="block text-green-200 mt-2">— even without internet.</span>
            </h1>
            <p className="text-lg sm:text-xl text-green-50 mb-10 max-w-2xl mx-auto lg:mx-0">
              Empowering farmers with instant disease detection, localized advice, and comprehensive farm management right in their pocket.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50 font-bold px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
              >
                Start Analyzing
                <ArrowRight className="h-5 w-5" />
              </button>
              <button 
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto bg-green-700/40 hover:bg-green-700/60 border border-green-500/30 text-white font-medium px-8 py-4 rounded-xl backdrop-blur-sm transition-all text-lg"
              >
                Explore Features
              </button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center">
            <div className="relative w-full aspect-square max-w-md">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="50" y="20" width="100" height="160" rx="12" fill="#1f2937" stroke="#374151" strokeWidth="4" />
                <rect x="55" y="25" width="90" height="150" rx="8" fill="#ecfdf5" />
                <path d="M100 50 C120 50, 140 70, 130 100 C120 130, 90 140, 70 120 C50 100, 70 60, 100 50 Z" fill="#22c55e" />
                <path d="M70 120 L100 90" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
                <path d="M100 90 L115 80" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <path d="M90 105 L110 115" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
                <line x1="55" y1="95" x2="145" y2="95" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2">
                  <animate attributeName="y1" values="40;160;40" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="40;160;40" dur="3s" repeatCount="indefinite" />
                </line>
                <rect x="55" y="40" width="90" height="55" fill="url(#scanGradient)" opacity="0.3">
                   <animate attributeName="y" values="-15;105;-15" dur="3s" repeatCount="indefinite" />
                </rect>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <rect x="65" y="140" width="70" height="25" rx="4" fill="#ffffff" />
                <circle cx="75" cy="152.5" r="5" fill="#22c55e" />
                <line x1="85" y1="148" x2="125" y2="148" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
                <line x1="85" y1="155" x2="110" y2="155" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">How It Works</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">Analyze your crops in three simple steps, without needing an internet connection.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-1/6 right-1/6 h-0.5 bg-green-100 -z-10 -translate-y-1/2"></div>
            {[
              { icon: Scan, title: 'Snap a Photo', desc: 'Take a picture of the affected leaf or crop using your smartphone camera.' },
              { icon: Activity, title: 'AI Analysis', desc: 'Our offline AI instantly analyzes the image to identify diseases or pests.' },
              { icon: CheckCircle2, title: 'Get Solutions', desc: 'Receive immediate, localized treatment recommendations and remedies.' }
            ].map((step, idx) => (
              <div key={idx} className="bg-white border border-neutral-100 rounded-2xl p-8 shadow-sm text-center relative">
                <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">{step.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">Comprehensive Farm Management</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">Everything you need to keep your crops healthy and maximize your yield.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Activity, title: 'AI Crop Analysis', desc: 'Instant detection of diseases, pests, and nutrient deficiencies with high accuracy.' },
              { icon: WifiOff, title: 'Offline Capability', desc: 'Full functionality without internet. Syncs data automatically when you go online.' },
              { icon: History, title: 'Crop History', desc: 'Track the complete lifecycle, previous issues, and treatments of all your fields.' },
              { icon: ShieldCheck, title: 'Disease Risk Analysis', desc: 'Predictive modeling warns you about potential outbreaks before they happen.' },
              { icon: TrendingUp, title: 'Growth Monitoring', desc: 'Log and monitor growth stages to ensure crops are developing optimally.' },
              { icon: CloudSun, title: 'Weather Intelligence', desc: 'Hyper-local weather forecasts and specialized agro-meteorological advisories.' },
              { icon: Languages, title: 'Local Languages', desc: 'Available in English, Hindi, Telugu, Tamil, and more regional languages.' },
              { icon: Mic, title: 'Voice Assistant', desc: 'Ask questions and navigate the app using natural voice commands.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-neutral-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-green-700 py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to transform your farming?</h2>
          <p className="text-green-100 text-lg mb-10">Explore how Marudham 360 can support farmers with crop-health guidance and farm records.</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-white text-green-700 hover:bg-green-50 font-bold px-10 py-4 rounded-xl shadow-lg transition-colors text-lg"
          >
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  );
}
