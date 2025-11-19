import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import { LanguageProvider } from "@/lib/language";
import { AIAssistant } from "@/components/AIAssistant";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { ShopifyConnectPrompt } from "@/components/ShopifyConnectPrompt";
import { useQuotaMonitoring } from "@/hooks/useQuotaMonitoring";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { AuthOnlyLayout } from "./components/AuthOnlyLayout";
import { AdminLayout } from "./components/AdminLayout";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
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
import Products from "./pages/Products";
import ProductTitleDescription from "./pages/ProductTitleDescription";
import MediaHistory from "./pages/MediaHistory";
import Collections from "./pages/Collections";
import TestGlobale from "./pages/TestGlobale";
import Blog from "./pages/Blog";
import ArticleManagement from "./pages/ArticleManagement";
import BlogNewAI from "./pages/BlogNewAI";
import BlogCampaignMonitoring from "./pages/BlogCampaignMonitoring";
import CronMonitoring from "./pages/CronMonitoring";
import SEO from "./pages/SEO";
import Integration from "./pages/Integration";
import Chat from "./pages/Chat";
import ChatOrders from "./pages/ChatOrders";
import ChatLearning from "./pages/ChatLearning";
import ProductEnrichment from "./pages/ProductEnrichment";
import ProductSource from "./pages/ProductSource";
import ProductLanding from "./pages/ProductLanding";
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
import ShopifyInstallGuide from "./pages/ShopifyInstallGuide";
import ShopifySuccess from "./pages/ShopifySuccess";
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
import TestRedirection from "./pages/TestRedirection";

const queryClient = new QueryClient();

function AppQuotaMonitor() {
  useQuotaMonitoring();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <StoreProvider>
              <AppQuotaMonitor />
            <div className="overflow-x-hidden max-w-full">
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/translation" element={<TranslationAudit />} />
            <Route path="/blog-newai" element={<BlogNewAI />} />
            <Route path="/blog-newai/:slug" element={<BlogNewAI />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/upgrade-success" element={<UpgradeSuccess />} />
            <Route path="/test-landing" element={<TestLandingGeneration />} />
          <Route path="/shopify/install" element={<ShopifyInstall />} />
          <Route path="/shopify/guide" element={<ShopifyInstallGuide />} />
          <Route path="/shopify/success" element={<ShopifySuccess />} />
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
              path="/blog"
              element={
                <ProtectedLayout>
                  <Blog />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
          <AIAssistant />
          <NotificationPermissionPrompt />
          <ShopifyConnectPrompt />
            </div>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
