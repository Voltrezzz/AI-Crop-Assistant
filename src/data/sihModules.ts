export const sihModules = [
  { id: 'planning', title: 'Crop Planning', path: '/crop-plan', icon: 'Sprout', description: 'Enter land and soil inputs, compare sample plans and start a crop cycle.', status: 'Local planning · sample estimates' },
  { id: 'health', title: 'Health & Alerts', path: '/health-alerts', icon: 'Satellite', description: 'Scan crops, review saved results, open field maps and check weather risks.', status: 'Local scans · Sentinel-2 scenes' },
  { id: 'offline', title: 'Offline & Voice', path: '/offline', icon: 'WifiOff', description: 'Check offline readiness, access voice navigation and manage cloud sync.', status: 'Local records · browser speech' },
  { id: 'memory', title: 'Farm Memory', path: '/farm-memory', icon: 'BookOpen', description: 'Keep a field timeline of cultivation, observations, harvests and sales.', status: 'Saved records · export' },
  { id: 'marketplace', title: 'Manpower & Equipment', path: '/marketplace', icon: 'Tractor', description: 'Explore the sample directory and save labour or machinery request drafts.', status: 'Local requests · sample directory' },
  { id: 'harvest', title: 'Post-Harvest', path: '/post-harvest', icon: 'Package', description: 'Record harvest quantity, manual quality grades, stock and whole-batch sales.', status: 'Local inventory · manual grades' },
  { id: 'finance', title: 'Market & Finance', path: '/finance', icon: 'IndianRupee', description: 'Review recorded revenue and expenses alongside market and scheme tools.', status: 'Recorded totals · market references' },
  { id: 'documents', title: 'Document Locker', path: '/documents', icon: 'FolderLock', description: 'Store, search and download PDFs, images and farm documents on this device.', status: 'Local encryption · no cloud backup' },
  { id: 'community', title: 'Community & Experts', path: '/community', icon: 'Users', description: 'Save questions and expert-help drafts, or open the existing friends network.', status: 'Local drafts · no expert dispatch' },
  { id: 'enterprise', title: 'Rural Enterprise', path: '/livelihood', icon: 'Recycle', description: 'Explore resource-based business ideas and save your enterprise plans.', status: 'Local plans · illustrative estimates' },
] as const;
