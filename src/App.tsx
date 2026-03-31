import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { IncomeProvider } from "@/contexts/IncomeContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Expenses from "./pages/Expenses";
import Incomes from "./pages/Incomes";
import Accounts from "./pages/Accounts";
import InvoiceReconciliation from "./pages/InvoiceReconciliation";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Goals from "./pages/Goals";
import LandingPage from "./pages/LandingPage";
import Planos from "./pages/Planos";
import Plans from "./pages/Plans";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import MySubscription from "./pages/MySubscription";
import Admin from "./pages/Admin";
import AdminCsat from "@/pages/AdminCsat";
import { APP_VERSION } from "@/config/version";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  requiredFeature,
}: {
  children: React.ReactNode;
  requiredFeature?: "ai_classification" | "advanced_reports" | "extra_control";
}) {
  const { isAuthenticated, isLoading, isSubscriptionValid, hasFeatureAccess } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Carregando sessão...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSubscriptionValid) {
    return <Navigate to="/planos?reason=expired" replace />;
  }

  if (requiredFeature && !hasFeatureAccess(requiredFeature)) {
    return <Navigate to={`/planos?reason=upgrade_required&feature=${requiredFeature}`} replace />;
  }

  return <Layout>{children}</Layout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Carregando autenticação...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isAdmin, isCheckingAdmin } = useIsAdmin();

  if (isLoading || isCheckingAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Carregando permissões...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/login" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<LandingPage />} />
    <Route path="/home" element={<LandingPage />} />
    <Route path="/planos" element={<Planos />} />
    <Route path="/plans" element={<Plans />} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
    <Route path="/incomes" element={<ProtectedRoute><Incomes /></ProtectedRoute>} />
    <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
    <Route path="/reconciliation" element={<ProtectedRoute><InvoiceReconciliation /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute requiredFeature="advanced_reports"><Reports /></ProtectedRoute>} />
    <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/subscription" element={<ProtectedRoute><MySubscription /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="/admin/csat" element={<AdminRoute><AdminCsat /></AdminRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const hasLoggedVersion = useRef(false);

  useEffect(() => {
    if (hasLoggedVersion.current) return;
    hasLoggedVersion.current = true;
    console.log(`%c 🚀 SmartBudget v${APP_VERSION} ativo`, "color:#059669;font-weight:700;");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Toaster />
          <Sonner
            richColors
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                description: 'group-[.toast]:text-muted-foreground',
                actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
              },
            }}
          />
          <BrowserRouter>
            <AuthProvider>
              <FinanceProvider>
                <IncomeProvider>
                  <GoalsProvider>
                    <AppRoutes />
                  </GoalsProvider>
                </IncomeProvider>
              </FinanceProvider>
            </AuthProvider>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
