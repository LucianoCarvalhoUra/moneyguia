import { ReactNode, useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import LGPDTermsModal from "@/components/LGPDTermsModal";
import CsatSurvey from "@/components/csat/CsatSurvey";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduledTransactions } from "@/hooks/useScheduledTransactions";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [showLgpd, setShowLgpd] = useState(false);
  useScheduledTransactions();
  const [lgpdLoading, setLgpdLoading] = useState(true);
  const shouldShowCsat = location.pathname.startsWith("/dashboard");

  const ROUTE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/goals": "Metas",
    "/expenses": "Despesas",
    "/incomes": "Receitas",
    "/accounts": "Contas",
    "/reconciliation": "Conciliação de Cartão",
    "/conciliacao": "Conciliação Bancária",
    "/reports": "Relatórios",
    "/report-builder": "Construtor de Comprovantes",
    "/subscription": "Assinatura",
    "/settings": "Configurações",
    "/admin": "Admin",
    "/admin/csat": "CSAT",
    "/plans": "Planos",
    "/planos": "Planos",
  };
  const currentTitle =
    Object.entries(ROUTE_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] || "MoneyGuia";

  useEffect(() => {
    document.title = `${currentTitle} | MoneyGuia`;
  }, [currentTitle]);

  const checkLgpdTerms = useCallback(async () => {
    try {
      if (!isAuthenticated || !user?.id) {
        setShowLgpd(false);
        setLgpdLoading(false);
        return;
      }

      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('lgpd_accepted_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const hasAcceptedLgpd = Boolean(data?.lgpd_accepted_at);

      if (!hasAcceptedLgpd) {
        setShowLgpd(true);
      } else {
        setShowLgpd(false);
      }
    } catch (err) {
      console.error('[LGPD Guard] Erro ao verificar aceite LGPD:', err);
      setShowLgpd(true);
    } finally {
      setLgpdLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    checkLgpdTerms();
  }, [checkLgpdTerms]);

  const handleLgpdAccept = async () => {
    await checkLgpdTerms();
    setShowLgpd(false);
  };

  return (
    <>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full overflow-x-hidden bg-background text-foreground">
          <AppSidebar />
          <div className="flex-1 flex min-w-0 flex-col overflow-x-hidden transition-all duration-300">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:px-6">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <span className="text-sm font-semibold text-foreground truncate">{currentTitle}</span>
            </header>
            <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
              <div className="w-full min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-300 sm:p-5 lg:p-7">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      {/* Modal LGPD - controlado pelo Layout */}
      {!lgpdLoading && showLgpd && (
        <LGPDTermsModal onAccept={handleLgpdAccept} />
      )}

      {shouldShowCsat && <CsatSurvey />}
    </>
  );
}
