import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";

// Redirect component for /app/installing → /app with preserved query params
const ShopifyAppRedirect = () => {
  const [params] = useSearchParams();
  const queryString = params.toString();
  return <Navigate to={`/app${queryString ? `?${queryString}` : ''}`} replace />;
};
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import { AutoSyncProvider, useAutoSyncProgress } from "./contexts/AutoSyncContext";
import { OptimizationProvider } from "./contexts/OptimizationContext";
import { LanguageProvider } from "@/lib/language";
import { FacebookSDKProvider } from "@/components/FacebookSDK";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AIAssistant } from "@/components/AIAssistant";
import { AutoSyncProgressDialog } from "@/components/AutoSyncProgressDialog";

import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { BulkOptimizationIndicator } from "@/components/BulkOptimizationIndicator";
import { PageTracker } from "@/components/PageTracker";
import { useQuotaMonitoring } from "@/hooks/useQuotaMonitoring";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useAdminEmailNotifications } from "@/hooks/useAdminEmailNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { AuthOnlyLayout } from "./components/AuthOnlyLayout";
import { AdminLayout } from "./components/AdminLayout";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import { ShopifyEmbeddedLayout } from "./layouts/ShopifyEmbeddedLayout";
import Index from "./pages/Index";
import TranslationAudit from "./pages/TranslationAudit";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import AdminSuperLogin from "./pages/AdminSuperLogin";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import DashboardLight from "./pages/DashboardLight";
import Products from "./pages/Products";
import ProductTitleDescription from "./pages/ProductTitleDescription";
import MediaHistory from "./pages/MediaHistory";
import Collections from "./pages/Collections";
import TestGlobale from "./pages/TestGlobale";
import Blog from "./pages/Blog";
import AEO from "./pages/AEO";
import AeoChatGPT from "./pages/AeoChatGPT";
import AeoGemini from "./pages/AeoGemini";
import AeoCopilot from "./pages/AeoCopilot";
import ArticleManagement from "./pages/ArticleManagement";
import BlogNewAI from "./pages/BlogNewAI";
import BlogSeoManagement from "./pages/BlogSeoManagement";
import BlogCampaignMonitoring from "./pages/BlogCampaignMonitoring";
import CronMonitoring from "./pages/CronMonitoring";
import SEO from "./pages/SEO";
import Integration from "./pages/Integration";
import Chat from "./pages/Chat";
import VendixChat from "./pages/VendixChat";
import ChatOrders from "./pages/ChatOrders";
import ChatLearning from "./pages/ChatLearning";
import ProductEnrichment from "./pages/ProductEnrichment";
import ProductSource from "./pages/ProductSource";
import ProductLanding from "./pages/ProductLanding";
import LandingPreferences from "./pages/LandingPreferences";
import LandingConfigurator from "./pages/LandingConfigurator";
import LandingOk from "./pages/LandingOk";
import ArticleLanding from "./pages/ArticleLanding";
import SeoSerpAnalysis from "./pages/SeoSerpAnalysis";
import LandingPage from "./pages/LandingPage";
import Account from "./pages/Account";
import Subscription from "./pages/Subscription";
import Merchant from "./pages/Merchant";
import GoogleAds from "./pages/GoogleAds";
import Shopping from "./pages/Shopping";
import SearchProducts from "./pages/SearchProducts";
import ChatHistory from "./pages/ChatHistory";
import ProductDetail from "./pages/ProductDetail";
import ShopifyInstall from "./pages/ShopifyInstall";
import ShopifyRecover from "./pages/ShopifyRecover";
import ShopifyInstallGuide from "./pages/ShopifyInstallGuide";
import ShopifySuccess from "./pages/ShopifySuccess";
import ShopifyApp from "./pages/ShopifyApp";

import ShopifyBillingCallback from "./pages/ShopifyBillingCallback";
import ShopifyPaymentCallback from "./pages/shopify/PaymentCallback";
import NotFound from "./pages/NotFound";
import ChatSettings from "./pages/ChatSettings";
import ChatRobot from "./pages/ChatRobot";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PerformanceMonitor from "./pages/PerformanceMonitor";
import Documentation from "./pages/Documentation";
import NotificationSettings from "./pages/NotificationSettings";
import Pricing from "./pages/Pricing";
import UsageAudit from "./pages/UsageAudit";
import TestEmail from "./pages/TestEmail";
import SetupPlans from "./pages/SetupPlans";
import PaymentSuccess from "./pages/PaymentSuccess";
import UpgradeSuccess from "./pages/UpgradeSuccess";
import TestLandingGeneration from "./pages/TestLandingGeneration";
import TestLectureImage from "./pages/TestLectureImage";
import TestRedirection from "./pages/TestRedirection";
import LandingTest from "./pages/LandingTest";
import SearchImage from "./pages/SearchImage";
import LandingDebug from "./pages/LandingDebug";
import ApiKeys from "./pages/ApiKeys";
import HomepageLiquid from "./pages/HomepageLiquid";
import ApiDocs from "./pages/ApiDocs";
import ApiAnalytics from "./pages/ApiAnalytics";
import UsageTable from "./pages/UsageTable";
import TestGdprWebhook from "./pages/TestGdprWebhook";
import ShopifyWebhooksAdmin from "./pages/ShopifyWebhooksAdmin";
import Demo from "./pages/Demo";
import SitemapXml from "./pages/SitemapXml";
import SocialMedia from "./pages/SocialMedia";
import SocialCallback from "./pages/SocialCallback";
import ShareFacebookTest from "./pages/ShareFacebookTest";
import AiCreativeStudio from "./pages/AiCreativeStudio";
import MobileAds from "./pages/MobileAds";
import MobileSuccess from "./pages/MobileSuccess";
import AnimationAds from "./pages/AnimationAds";
import NewAIVideoGenerator from "./components/video/NewAIVideoGenerator";
import StoreTemplates from "./pages/StoreTemplates";
import SetupWizardPage from "./pages/shopify/SetupWizard";
import PlansEmbedded from "./pages/shopify/PlansEmbedded";
import AeoLanding from "./pages/AeoLanding";
import AeoAuth from "./pages/AeoAuth";
import AeoDashboard from "./pages/AeoDashboard";
import AeoAnswers from "./pages/AeoAnswers";
import AeoArticles from "./pages/AeoArticles";
import AeoOnboarding from "./pages/AeoOnboarding";
import AeoPricing from "./pages/AeoPricing";
import AeoSubscription from "./pages/AeoSubscription";
import AeoAccount from "./pages/AeoAccount";
import AeoPublicAnswer from "./pages/AeoPublicAnswer";
import AeoKeywordTracking from "./pages/AeoKeywordTracking";
import AeoUrlTracking from "./pages/AeoUrlTracking";
import AeoCalendar from "./pages/AeoCalendar";
import { AeoProtectedLayout } from "./components/aeo/AeoProtectedLayout";
import AeoSetupWizard from "./components/aeo/AeoSetupWizard";
import { isAeoreplyDomain, isAiImagesDomain } from "./hooks/useAppMode";
import { HelmetProvider } from "react-helmet-async";
import AiImagesLanding from "./pages/ai-images/AiImagesLanding";
import AiImagesDashboard from "./pages/ai-images/AiImagesDashboard";
import AiImagesAuth from "./pages/ai-images/AiImagesAuth";
import AiImagesShopifyInstall from "./pages/ai-images/AiImagesShopifyInstall";
import AiImagesShopifySuccess from "./pages/ai-images/AiImagesShopifySuccess";
import AiImagesSetupWizard from "./pages/ai-images/AiImagesSetupWizard";
import { AiImagesProtectedLayout } from "./components/ai-images/AiImagesProtectedLayout";
import { AiImagesAppBridgeProvider } from "./components/ai-images/AiImagesAppBridgeProvider";


const queryClient = new QueryClient();

function AppQuotaMonitor() {
  useQuotaMonitoring();
  return null;
}

function AdminEmailNotificationsMonitor() {
  useAdminEmailNotifications();
  return null;
}

function AutoSyncMonitor() {
  const { user } = useAuth();
  const { endSync } = useAutoSyncProgress();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      endSync();
    }
  }, [userId, endSync]);

  useAutoSync(userId);
  
  return null;
}

// Dynamic routing component - evaluates domain at runtime
function AeoreplyRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<AeoLanding />} />
      <Route path="/auth" element={<AeoAuth />} />
      <Route path="/onboarding" element={<AeoOnboarding />} />
      <Route path="/aeo-setup" element={<AeoProtectedLayout><AeoSetupWizard /></AeoProtectedLayout>} />
      <Route path="/pricing" element={<AeoPricing />} />
      <Route path="/dashboard" element={<AeoProtectedLayout><AeoDashboard /></AeoProtectedLayout>} />
      <Route path="/wizard" element={<AeoProtectedLayout><AEO /></AeoProtectedLayout>} />
      <Route path="/opportunities" element={<AeoProtectedLayout><AEO /></AeoProtectedLayout>} />
      <Route path="/answers" element={<AeoProtectedLayout><AeoAnswers /></AeoProtectedLayout>} />
      <Route path="/articles" element={<AeoProtectedLayout><AeoArticles /></AeoProtectedLayout>} />
      <Route path="/tracking/keywords" element={<AeoProtectedLayout><AeoKeywordTracking /></AeoProtectedLayout>} />
      <Route path="/tracking/urls" element={<AeoProtectedLayout><AeoUrlTracking /></AeoProtectedLayout>} />
      <Route path="/integrations" element={<AeoProtectedLayout><Integration /></AeoProtectedLayout>} />
      <Route path="/settings" element={<AeoProtectedLayout><AeoAccount /></AeoProtectedLayout>} />
      <Route path="/account" element={<AeoProtectedLayout><AeoAccount /></AeoProtectedLayout>} />
      <Route path="/subscription" element={<AeoProtectedLayout><AeoSubscription /></AeoProtectedLayout>} />
      {/* Public AEO Answer pages - /:brand/answers/:slug */}
      <Route path="/:brand/answers/:slug" element={<AeoPublicAnswer />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  );
}

function NewAIRoutes() {
  return (
    <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sitemap.xml" element={<SitemapXml />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/mobileads" element={<MobileAds />} />
            <Route path="/mobile-success" element={<MobileSuccess />} />
            <Route path="/animationads" element={<AnimationAds />} />
            <Route path="/videogenerator" element={<NewAIVideoGenerator />} />
            <Route path="/social-callback" element={<SocialCallback />} />
            <Route path="/sharefacebook" element={<ShareFacebookTest />} />
            <Route path="/translation" element={<TranslationAudit />} />
            <Route path="/blog-newai" element={<BlogNewAI />} />
            <Route path="/blog-newai/:slug" element={<BlogNewAI />} />
            <Route path="/blog-seo-management" element={<BlogSeoManagement />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/aeoreply" element={<AeoLanding />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/upgrade-success" element={<UpgradeSuccess />} />
            <Route path="/test-landing" element={<TestLandingGeneration />} />
            <Route path="/testlectureimage" element={<TestLectureImage />} />
            <Route path="/landingtest" element={<LandingTest />} />
            <Route path="/searchimage" element={<SearchImage />} />
            <Route path="/landing-debug" element={<LandingDebug />} />
          <Route path="/shopify/install" element={<ShopifyInstall />} />
          <Route path="/shopify/recover" element={<ShopifyRecover />} />
          <Route path="/shopify/guide" element={<ShopifyInstallGuide />} />
          <Route path="/shopify/success" element={<ShopifySuccess />} />
          <Route path="/shopify/billing-callback" element={<ShopifyBillingCallback />} />
          <Route path="/shopify/payment-callback" element={<ShopifyPaymentCallback />} />
          {/* Shopify App Routes */}
          {/* Page Plans EMBEDDED dans Shopify Admin (affichée après installation) */}
          <Route path="/app/plans-embedded" element={<PlansEmbedded />} />
          {/* Routes standalone (non-embedded) */}
          {/* Redirection /app/installing vers /app pour compatibilité */}
          <Route path="/app/installing" element={<ShopifyAppRedirect />} />
          <Route path="/app/setup-wizard" element={<SetupWizardPage />} />
          <Route path="/app" element={<ShopifyApp />} />
            <Route
              path="/onboarding"
              element={
                <AuthOnlyLayout>
                  <Onboarding />
                </AuthOnlyLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard-light"
              element={
                <ProtectedLayout>
                  <DashboardLight />
                </ProtectedLayout>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedLayout>
                  <Products />
                </ProtectedLayout>
              }
            />
            <Route
              path="/products/title-description"
              element={
                <ProtectedLayout>
                  <ProductTitleDescription />
                </ProtectedLayout>
              }
            />
            <Route
              path="/products/media-history"
              element={
                <ProtectedLayout>
                  <MediaHistory />
                </ProtectedLayout>
              }
            />
            <Route
              path="/products/homepage"
              element={
                <ProtectedLayout>
                  <HomepageLiquid />
                </ProtectedLayout>
              }
            />
            <Route
              path="/testglobale"
              element={
                <ProtectedLayout>
                  <TestGlobale />
                </ProtectedLayout>
              }
            />
            <Route path="/testredirection" element={<TestRedirection />} />
            <Route
              path="/collections"
              element={
                <ProtectedLayout>
                  <Collections />
                </ProtectedLayout>
              }
            />
            <Route
              path="/landing-preferences"
              element={
                <ProtectedLayout>
                  <LandingPreferences />
                </ProtectedLayout>
              }
            />
            <Route
              path="/landing-configurator"
              element={
                <ProtectedLayout>
                  <LandingConfigurator />
                </ProtectedLayout>
              }
            />
            <Route
              path="/landingok"
              element={
                <ProtectedLayout>
                  <LandingOk />
                </ProtectedLayout>
              }
            />
            <Route
              path="/blog"
              element={
                <ProtectedLayout>
                  <Blog />
                </ProtectedLayout>
              }
            />
            <Route
              path="/aeo"
              element={
                <ProtectedLayout>
                  <AEO />
                </ProtectedLayout>
              }
            />
            <Route
              path="/aeo-chatgpt"
              element={
                <ProtectedLayout>
                  <AeoChatGPT />
                </ProtectedLayout>
              }
            />
            <Route
              path="/aeo-gemini"
              element={
                <ProtectedLayout>
                  <AeoGemini />
                </ProtectedLayout>
              }
            />
            <Route
              path="/aeo-copilot"
              element={
                <ProtectedLayout>
                  <AeoCopilot />
                </ProtectedLayout>
              }
            />
            <Route
              path="/aeo-calendar"
              element={
                <ProtectedLayout>
                  <AeoCalendar />
                </ProtectedLayout>
              }
            />
            <Route
              path="/blog/management"
              element={
                <ProtectedLayout>
                  <ArticleManagement />
                </ProtectedLayout>
              }
            />
            <Route
              path="/blog-monitoring"
              element={
                <ProtectedLayout>
                  <BlogCampaignMonitoring />
                </ProtectedLayout>
              }
            />
            <Route
              path="/cron-monitoring"
              element={
                <ProtectedLayout>
                  <CronMonitoring />
                </ProtectedLayout>
              }
            />
            <Route
              path="/seo"
              element={
                <ProtectedLayout>
                  <SEO />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedLayout>
                  <Chat />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat-orders"
              element={
                <ProtectedLayout>
                  <ChatOrders />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat-learning"
              element={
                <ProtectedLayout>
                  <ChatLearning />
                </ProtectedLayout>
              }
            />
            <Route
              path="/product-enrichment"
              element={
                <ProtectedLayout>
                  <ProductEnrichment />
                </ProtectedLayout>
              }
            />
            <Route
              path="/product-source"
              element={
                <ProtectedLayout>
                  <ProductSource />
                </ProtectedLayout>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedLayout>
                  <Account />
                </ProtectedLayout>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedLayout>
                  <Subscription />
                </ProtectedLayout>
              }
            />
            <Route
              path="/integration"
              element={
                <ProtectedLayout>
                  <Integration />
                </ProtectedLayout>
              }
            />
            <Route
              path="/merchant"
              element={
                <ProtectedLayout>
                  <Merchant />
                </ProtectedLayout>
              }
            />
            <Route
              path="/google-ads"
              element={
                <ProtectedLayout>
                  <GoogleAds />
                </ProtectedLayout>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedLayout>
                  <Pricing />
                </ProtectedLayout>
              }
            />
            <Route
              path="/shopping"
              element={
                <ProtectedLayout>
                  <Shopping />
                </ProtectedLayout>
              }
            />
            <Route
              path="/search-products"
              element={
                <ProtectedLayout>
                  <SearchProducts />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat-history"
              element={
                <ProtectedLayout>
                  <ChatHistory />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat-settings"
              element={
                <ProtectedLayout>
                  <ChatSettings />
                </ProtectedLayout>
              }
            />
            <Route
              path="/notification-settings"
              element={
                <ProtectedLayout>
                  <NotificationSettings />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat-robot"
              element={
                <ProtectedLayout>
                  <ChatRobot />
                </ProtectedLayout>
              }
            />
            <Route
              path="/performance"
              element={
                <ProtectedLayout>
                  <PerformanceMonitor />
                </ProtectedLayout>
              }
            />
            <Route
              path="/usage-audit"
              element={
                <ProtectedLayout>
                  <UsageAudit />
                </ProtectedLayout>
              }
            />
            <Route
              path="/testemail"
              element={
                <ProtectedLayout>
                  <TestEmail />
                </ProtectedLayout>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedLayout>
                  <SearchProducts />
                </ProtectedLayout>
              }
            />
            <Route
              path="/store-templates"
              element={
                <ProtectedLayout>
                  <StoreTemplates />
                </ProtectedLayout>
              }
            />
            <Route
              path="/product/:handle"
              element={
                <ProtectedLayout>
                  <ProductDetail />
                </ProtectedLayout>
              }
            />
            <Route
              path="/product-landing/:id"
              element={
                <ProtectedLayout>
                  <ProductLanding />
                </ProtectedLayout>
              }
            />
            <Route
              path="/article-landing/:id"
              element={
                <ProtectedLayout>
                  <ArticleLanding />
                </ProtectedLayout>
              }
            />
            <Route
              path="/product/:productId/seo-analysis"
              element={
                <ProtectedLayout>
                  <SeoSerpAnalysis />
                </ProtectedLayout>
              }
            />
            <Route path="/landing/:campaignId" element={<LandingPage />} />
            <Route path="/adminsuper" element={<AdminSuperLogin />} />
            <Route
              path="/admin"
              element={
                <AdminLayout>
                  <Admin />
                </AdminLayout>
              }
            />
            <Route
              path="/superadmin"
              element={
                <SuperAdminLayout>
                  {({ activeTab, setActiveTab }) => <SuperAdmin activeTab={activeTab} setActiveTab={setActiveTab} />}
                </SuperAdminLayout>
              }
            />
            <Route
              path="/setup-plans"
              element={
                <SuperAdminLayout>
                  {({ activeTab, setActiveTab }) => <SetupPlans />}
                </SuperAdminLayout>
              }
            />
            <Route
              path="/api-keys"
              element={
                <ProtectedLayout>
                  <ApiKeys />
                </ProtectedLayout>
              }
            />
            <Route
              path="/api-docs"
              element={
                <ProtectedLayout>
                  <ApiDocs />
                </ProtectedLayout>
              }
            />
            <Route
              path="/api-analytics"
              element={
                <ProtectedLayout>
                  <ApiAnalytics />
                </ProtectedLayout>
              }
            />
            <Route
              path="/usage-table"
              element={
                <ProtectedLayout>
                  <UsageTable />
                </ProtectedLayout>
              }
            />
            <Route path="/test-gdpr-webhook" element={<TestGdprWebhook />} />
            <Route path="/admin/shopify-webhooks" element={<ShopifyWebhooksAdmin />} />
            <Route
              path="/social-media"
              element={
                <ProtectedLayout>
                  <SocialMedia />
                </ProtectedLayout>
              }
            />
            <Route
              path="/ai-creative-studio"
              element={
                <ProtectedLayout>
                  <AiCreativeStudio />
                </ProtectedLayout>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ============================================
// AI Images Routes - STANDALONE MODE (like NewAI)
// ============================================
// No App Bridge complexity - simple URL-based routing
function AiImagesRoutes() {
  const search = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Detect Shopify install request (has hmac + shop + timestamp)
  const hmac = search.get("hmac");
  const shop = search.get("shop");
  const timestamp = search.get("timestamp");
  const pendingToken = search.get("pending_token");
  const isInstallRequest = hmac && shop && timestamp && !pendingToken;
  
  console.log('📦 AiImagesRoutes (STANDALONE):', { pathname, isInstallRequest, hasPendingToken: !!pendingToken });
  
  // PRIORITY 0: Install request → Redirect to OAuth edge function
  if (isInstallRequest) {
    console.log('📦 AiImagesRoutes - Install request → OAuth edge function');
    
    const edgeFunctionUrl = new URL(
      "https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/ai-images-shopify-install"
    );
    search.forEach((value, key) => {
      edgeFunctionUrl.searchParams.set(key, value);
    });
    
    window.location.href = edgeFunctionUrl.toString();
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin text-primary mx-auto mb-4 border-4 border-current border-t-transparent rounded-full" />
          <h1 className="text-xl font-semibold mb-2">Connecting to Shopify...</h1>
          <p className="text-muted-foreground">Please wait while we set up AI Product Image Shot.</p>
        </div>
      </div>
    );
  }
  
  // STANDALONE routing - simple path-based (like NewAI)
  return (
    <Routes>
      {/* Shopify OAuth callbacks */}
      <Route path="/shopify/install" element={<AiImagesShopifyInstall />} />
      <Route path="/shopify/success" element={<AiImagesShopifySuccess />} />
      
      {/* App routes (standalone) */}
      <Route path="/app/setup-wizard" element={<AiImagesSetupWizard />} />
      <Route path="/app/dashboard" element={<AiImagesProtectedLayout><AiImagesDashboard /></AiImagesProtectedLayout>} />
      
      {/* Legacy routes (for backwards compat) */}
      <Route path="/setup" element={<AiImagesSetupWizard />} />
      <Route path="/dashboard" element={<AiImagesProtectedLayout><AiImagesDashboard /></AiImagesProtectedLayout>} />
      
      {/* Public pages */}
      <Route path="/" element={<AiImagesLanding />} />
      <Route path="/auth" element={<AiImagesAuth />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Dynamic route selector - evaluates at runtime
function AppRoutes() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const fullUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  console.log('🚀 AppRoutes - Current hostname:', hostname);
  console.log('🚀 AppRoutes - Full URL:', fullUrl);
  
  const isAeoreply = isAeoreplyDomain();
  const isAiImages = isAiImagesDomain();
  
  console.log('🚀 AppRoutes - Detection results:', { isAiImages, isAeoreply, hostname });
  
  if (isAiImages) {
    console.log('✅ Rendering AiImagesRoutes for hostname:', hostname);
    return <AiImagesRoutes />;
  }
  
  if (isAeoreply) {
    return <AeoreplyRoutes />;
  }
  
  return <NewAIRoutes />;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <LanguageProvider>
          <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <FacebookSDKProvider>
              <AutoSyncProvider>
                <StoreProvider>
                  <OptimizationProvider>
                    <AppQuotaMonitor />
                    <AutoSyncMonitor />
                    <AdminEmailNotificationsMonitor />
                    
                    <BulkOptimizationIndicator />
                    <PageTracker />
                    <div className="overflow-x-hidden max-w-full">
                      <AppRoutes />
                      <Toaster />
                      <Sonner />
                      <AIAssistant />
                      <NotificationPermissionPrompt />
                      <AutoSyncProgressDialog />
                    </div>
                  </OptimizationProvider>
                </StoreProvider>
              </AutoSyncProvider>
              </FacebookSDKProvider>
            </AuthProvider>
          </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
