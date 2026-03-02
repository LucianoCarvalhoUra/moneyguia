import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { IncomeProvider } from "@/contexts/IncomeContext";
import { GoalsProvider } from "@/contexts/GoalsContext";
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
<<<<<<< HEAD
import Planos from "./pages/Planos";
=======
import Plans from "./pages/Plans";
import Checkout from "./pages/Checkout";
>>>>>>> 444b4405b3eabc7f803a93b19fc5214ab5f07ee8
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

function ProtectedRoute({
  children,
  requiredFeature,
}: {
  children: React.ReactNode;
  requiredFeature?: "ai_classification" | "advanced_reports" | "extra_control";
}) {
  const { isAuthenticated, isLoading, isProfileLoading, isSubscriptionValid, hasFeatureAccess } = useAuth();

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Carregando...</div>
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<LandingPage />} />
    <Route path="/planos" element={<Planos />} />
    <Route path="/welcome" element={<LandingPage />} />
    <Route path="/home" element={<LandingPage />} />
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
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
