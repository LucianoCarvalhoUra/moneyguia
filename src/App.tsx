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
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<Index />} />
    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
    <Route path="/incomes" element={<ProtectedRoute><Incomes /></ProtectedRoute>} />
    <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
    <Route path="/reconciliation" element={<ProtectedRoute><InvoiceReconciliation /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/reset-password" element={<ProtectedRoute><ResetPassword /></ProtectedRoute>} />
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
