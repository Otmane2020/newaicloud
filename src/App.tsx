import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { Navigation } from "./components/Navigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Blog from "./pages/Blog";
import SEO from "./pages/SEO";
import Integration from "./pages/Integration";
import Chat from "./pages/Chat";
import Account from "./pages/Account";
import Subscription from "./pages/Subscription";
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
                  <Navigation />
                  <Dashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <Products />
                </ProtectedLayout>
              }
            />
            <Route
              path="/blog"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <Blog />
                </ProtectedLayout>
              }
            />
            <Route
              path="/seo"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <SEO />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <Chat />
                </ProtectedLayout>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <Account />
                </ProtectedLayout>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <Subscription />
                </ProtectedLayout>
              }
            />
            <Route
              path="/integration"
              element={
                <ProtectedLayout>
                  <Navigation />
                  <Integration />
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
