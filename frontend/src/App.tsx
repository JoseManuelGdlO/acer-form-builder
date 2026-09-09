import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PublicFormView from "./pages/PublicFormView";
import NotFound from "./pages/NotFound";
import DomainNotConfigured from "./pages/DomainNotConfigured";

const queryClient = new QueryClient();

function AppContent() {
  const { tenantError, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-1.5 w-16 rounded-full bg-secondary" aria-hidden />
          <p className="font-display text-lg font-semibold">Cargando...</p>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      </div>
    );
  }

  if (tenantError === 'not_found') {
    return <DomainNotConfigured />;
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/form/:formId" element={<PublicFormView />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  </QueryClientProvider>
);

export default App;
