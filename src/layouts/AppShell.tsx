import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, Map, History, Cloud, AlertTriangle,
  BookOpen, TrendingUp, FileText, Settings, Menu, X, Bell, Wifi, WifiOff, HardDrive, FlaskConical,
  User, Leaf, Droplets, LandPlot, MessageCircle, Dog, Landmark,
  Store, BarChart3, Bug, Mic, ChevronDown, ChevronUp, LogOut
} from 'lucide-react';
import { cn } from '@/utils';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/analyzer', label: 'Scan Leaf', icon: <ScanLine size={20} /> },
      { path: '/chatbot', label: 'AI Chatbot', icon: <MessageCircle size={20} /> },
      { path: '/voice', label: 'Voice Assistant', icon: <Mic size={20} /> },
    ],
  },
  {
    title: 'Farm Management',
    items: [
      { path: '/fields', label: 'My Fields', icon: <Map size={20} /> },
      { path: '/land', label: 'Farm Overview', icon: <LandPlot size={20} /> },
      { path: '/irrigation', label: 'Water Irrigation', icon: <Droplets size={20} /> },
      { path: '/fertilizer-calculator', label: 'Fertilizer Calculator', icon: <FlaskConical size={20} /> },
      { path: '/growth', label: 'Growth Monitoring', icon: <TrendingUp size={20} /> },
    ],
  },
  {
    title: 'Crop Health',
    items: [
      { path: '/history', label: 'Crop History', icon: <History size={20} /> },
      { path: '/weather', label: 'Weather', icon: <Cloud size={20} /> },
      { path: '/risk', label: 'Disease Risk', icon: <AlertTriangle size={20} /> },
      { path: '/advisories', label: 'Advisories', icon: <BookOpen size={20} /> },
      { path: '/insect-bite', label: 'AI Pest Advisory', icon: <Bug size={20} /> },
    ],
  },
  {
    title: 'Market & Finance',
    items: [
      { path: '/market', label: 'Market Analysis', icon: <BarChart3 size={20} /> },
      { path: '/loans', label: 'Loans & Schemes', icon: <Landmark size={20} /> },
      { path: '/shops', label: 'Fertilizer Shops', icon: <Store size={20} /> },
    ],
  },
  {
    title: 'Livestock',
    items: [
      { path: '/animals', label: 'Animal Monitor', icon: <Dog size={20} /> },
    ],
  },
  {
    title: 'Other',
    items: [
      { path: '/reports', label: 'Reports', icon: <FileText size={20} /> },
      { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    ],
  },
];

const mobileNav: NavItem[] = [
  { path: '/dashboard', label: 'Home', icon: <LayoutDashboard size={22} /> },
  { path: '/chatbot', label: 'Chat', icon: <MessageCircle size={22} /> },
  { path: '/analyzer', label: 'Scan', icon: <ScanLine size={22} /> },
  { path: '/fields', label: 'Fields', icon: <Map size={22} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={22} /> },
];

const navTranslationKeys: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/analyzer': 'nav.scanLeaf',
  '/chatbot': 'nav.aiChatbot',
  '/voice': 'nav.voiceAssistant',
  '/fields': 'nav.myFields',
  '/land': 'nav.farmOverview',
  '/irrigation': 'nav.waterIrrigation',
  '/fertilizer-calculator': 'nav.fertilizerCalculator',
  '/growth': 'nav.growthMonitoring',
  '/history': 'nav.cropHistory',
  '/weather': 'nav.weather',
  '/risk': 'nav.diseaseRisk',
  '/advisories': 'nav.advisories',
  '/insect-bite': 'nav.pestAdvisory',
  '/market': 'nav.marketAnalysis',
  '/loans': 'nav.loansSchemes',
  '/shops': 'nav.fertilizerShops',
  '/animals': 'nav.animalMonitor',
  '/reports': 'nav.reports',
  '/settings': 'nav.settings',
};

const mobileTranslationKeys: Record<string, string> = {
  '/dashboard': 'nav.home',
  '/chatbot': 'nav.aiChatbot',
  '/analyzer': 'nav.scan',
  '/fields': 'nav.fields',
  '/settings': 'nav.settings',
};

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const theme = useSettingsStore((state) => state.theme);
  const initializeTheme = useSettingsStore((state) => state.initializeTheme);
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings, user?.id]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme, theme]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const translatedLabel = (item: NavItem, mobile = false) => {
    const key = (mobile ? mobileTranslationKeys : navTranslationKeys)[item.path];
    if (!key) return item.label;
    const translated = t(key);
    return translated === key ? item.label : translated;
  };

  const renderNav = () => (
    <>
      {navSections.map((section) => (
        <div key={section.title} className="mb-1">
          <button
            onClick={() => toggleSection(section.title)}
            className="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {section.title}
            {collapsedSections[section.title] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          {!collapsedSections[section.title] && (
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  )}
                >
                  {item.icon}
                  {translatedLabel(item)}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 transition-colors dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-slate-800">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Leaf className="text-primary-600" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">CropSense AI</h1>
            <p className="text-xs text-gray-500">Smart Farm Manager</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">
          {renderNav()}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            {online ? (
              <><Wifi size={14} className="text-green-500" /><span className="text-green-600">{t('general.online')}</span></>
            ) : (
              <><WifiOff size={14} className="text-red-500" /><span className="text-red-600">{t('general.offline')}</span></>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col z-50 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Leaf className="text-primary-600" size={20} />
                </div>
                <h1 className="text-lg font-bold text-gray-900">CropSense AI</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
              {renderNav()}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-slate-950">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between shrink-0 transition-colors dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <Leaf className="text-primary-600" size={22} />
              <span className="font-bold text-gray-900">CropSense AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border">
              {online ? (
                <><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-green-700">{t('general.online')}</span></>
              ) : (
                <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-red-700">{t('general.offline')}</span></>
              )}
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-lg hover:bg-gray-100 relative dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-600" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="hidden sm:flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-700" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">{user?.name || 'User'}</span>
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-lg hover:bg-gray-100 relative dark:hover:bg-slate-800"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 transition-colors dark:bg-slate-950 lg:pb-4">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-1.5 z-40 dark:border-slate-700 dark:bg-slate-900">
          {mobileNav.map((item) => {
            const active = isActive(item.path);
            const isScan = item.path === '/analyzer';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px]',
                  isScan
                    ? 'relative -mt-5'
                    : active
                      ? 'text-primary-600'
                      : 'text-gray-400'
                )}
              >
                {isScan ? (
                  <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
                    'bg-primary-600 text-white pulse-green'
                  )}>
                    <ScanLine size={26} />
                  </div>
                ) : (
                  item.icon
                )}
                <span className={cn('text-[10px] font-medium', isScan && 'mt-1')}>
                  {translatedLabel(item, true)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
