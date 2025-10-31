import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AIAssistant } from "@/components/AIAssistant";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { AuthOnlyLayout } from "./components/AuthOnlyLayout";
import { AdminLayout } from "./components/AdminLayout";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Collections from "./pages/Collections";
import Blog from "./pages/Blog";
import ArticleManagement from "./pages/ArticleManagement";
import SEO from "./pages/SEO";
import Integration from "./pages/Integration";
import Chat from "./pages/Chat";
import ProductEnrichment from "./pages/ProductEnrichment";
import ProductSource from "./pages/ProductSource";
import ProductLanding from "./pages/ProductLanding";
import ArticleLanding from "./pages/ArticleLanding";
import LandingPage from "./pages/LandingPage";
import Account from "./pages/Account";
import Subscription from "./pages/Subscription";
import Merchant from "./pages/Merchant";
import Shopping from "./pages/Shopping";
import SearchProducts from "./pages/SearchProducts";
import ChatHistory from "./pages/ChatHistory";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import ChatSettings from "./pages/ChatSettings";
import ChatRobot from "./pages/ChatRobot";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PerformanceMonitor from "./pages/PerformanceMonitor";
import Documentation from "./pages/Documentation";
import NotificationSettings from "./pages/NotificationSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
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
            <Route path="/landing/:campaignId" element={<LandingPage />} />
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
                  <SuperAdmin />
                </SuperAdminLayout>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
          <AIAssistant />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
