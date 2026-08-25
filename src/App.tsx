import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/layouts/AppShell';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicRoute from '@/components/PublicRoute';

// Lazy load all pages for performance
const ProfileSelectionPage = lazy(() => import('@/pages/ProfileSelectionPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AnalyzerPage = lazy(() => import('@/pages/AnalyzerPage'));
const AnalysisResultPage = lazy(() => import('@/pages/AnalysisResultPage'));
const HistoryPage = lazy(() => import('@/pages/HistoryPage'));
const ScanDetailPage = lazy(() => import('@/pages/ScanDetailPage'));
const FieldsPage = lazy(() => import('@/pages/FieldsPage'));
const AddFieldPage = lazy(() => import('@/pages/AddFieldPage'));
const FieldDetailPage = lazy(() => import('@/pages/FieldDetailPage'));
const GrowthPage = lazy(() => import('@/pages/GrowthPage'));
const WeatherPage = lazy(() => import('@/pages/WeatherPage'));
const RiskPage = lazy(() => import('@/pages/RiskPage'));
const AdvisoriesPage = lazy(() => import('@/pages/AdvisoriesPage'));
const VoiceAssistantPage = lazy(() => import('@/pages/VoiceAssistantPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

// New feature pages
const IrrigationPage = lazy(() => import('@/pages/IrrigationPage'));
const LandSegregationPage = lazy(() => import('@/pages/LandSegregationPage'));
const ChatbotPage = lazy(() => import('@/pages/ChatbotPage'));
const AnimalsPage = lazy(() => import('@/pages/AnimalsPage'));
const LoansPage = lazy(() => import('@/pages/LoansPage'));
const FertilizerShopsPage = lazy(() => import('@/pages/FertilizerShopsPage'));
const MarketAnalysisPage = lazy(() => import('@/pages/MarketAnalysisPage'));
const InsectBitePage = lazy(() => import('@/pages/InsectBitePage'));

const FertilizerCalculatorPage = lazy(() => import('@/pages/FertilizerCalculatorPage'));

const ComparePage = lazy(() => import('@/pages/ComparePage'));
const FriendsPage = lazy(() => import('@/pages/FriendsPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          
          {/* Protected routes */}
          <Route path="/profiles" element={<ProtectedRoute><ProfileSelectionPage /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

          {/* App routes (inside AppShell, all protected) */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            
          <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analyzer" element={<AnalyzerPage />} />
            <Route path="/analyzer/result/:id" element={<AnalysisResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<ScanDetailPage />} />
            <Route path="/fields" element={<FieldsPage />} />
            <Route path="/fields/new" element={<AddFieldPage />} />
            <Route path="/fields/:id" element={<FieldDetailPage />} />
            <Route path="/fields/:id/progress" element={<GrowthPage />} />
            <Route path="/growth" element={<GrowthPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/risk" element={<RiskPage />} />
            <Route path="/advisories" element={<AdvisoriesPage />} />
            <Route path="/voice" element={<VoiceAssistantPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Disabled until a trusted server-managed admin role exists. */}
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />

            {/* New feature routes */}
            <Route path="/irrigation" element={<IrrigationPage />} />
            <Route path="/land" element={<LandSegregationPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/animals" element={<AnimalsPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/shops" element={<FertilizerShopsPage />} />
            <Route path="/fertilizer-calculator" element={<FertilizerCalculatorPage />} />
            <Route path="/market" element={<MarketAnalysisPage />} />
            <Route path="/insect-bite" element={<InsectBitePage />} />
            
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/chat/:friendId" element={<ChatPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}


