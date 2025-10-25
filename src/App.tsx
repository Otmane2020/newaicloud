import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedLayout } from "./components/ProtectedLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Blog from "./pages/Blog";
import SEO from "./pages/SEO";
import Integration from "./pages/Integration";
import Chat from "./pages/Chat";
import ProductEnrichment from "./pages/ProductEnrichment";
import Account from "./pages/Account";
import Subscription from "./pages/Subscription";
import Merchant from "./pages/Merchant";
import Shopping from "./pages/Shopping";
import SearchProducts from "./pages/SearchProducts";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedLayout>
                  <Onboarding />
                </ProtectedLayout>
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
              path="/blog"
              element={
                <ProtectedLayout>
                  <Blog />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
