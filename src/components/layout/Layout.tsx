import { ReactNode, useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import LGPDTermsModal from "@/components/LGPDTermsModal";
import CsatSurvey from "@/components/csat/CsatSurvey";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const [showLgpd, setShowLgpd] = useState(false);
  const [lgpdLoading, setLgpdLoading] = useState(true);

  const checkLgpdTerms = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('[Layout LGPD] Query executada para ID:', user?.id);
      
      if (!user) {
        console.log('[Layout LGPD] No user, hiding modal');
        setLgpdLoading(false);
        return;
      }

      // Usar user_id na consulta
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('accepted_terms')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[Layout LGPD] Profile data:', data);
      console.log('[Layout LGPD] Profile error:', error);
      console.log('[Layout LGPD] accepted_terms value:', data?.accepted_terms);

      // Tratamento robusto: mostrar modal se não tem dados OU accepted_terms não é explicitamente true
      const hasAcceptedTerms = data?.accepted_terms === true;
      
      console.log('[Layout LGPD] Has accepted terms:', hasAcceptedTerms);

      if (!hasAcceptedTerms) {
        console.log('[Layout LGPD] Showing modal - terms NOT accepted');
        setShowLgpd(true);
      } else {
        console.log('[Layout LGPD] Hiding modal - terms already accepted');
        setShowLgpd(false);
      }
    } catch (err) {
      console.error('[Layout LGPD] Exception checking terms:', err);
      // Em caso de erro, mostrar modal como fallback
      setShowLgpd(true);
    } finally {
      setLgpdLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLgpdTerms();
  }, [checkLgpdTerms]);

  const handleLgpdAccept = () => {
    console.log('[Layout LGPD] onAccept called - hiding modal');
    setShowLgpd(false);
  };

  return (
    <>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:px-6">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <span className="text-sm font-medium text-muted-foreground md:hidden">MoneyGuia</span>
            </header>
            <main className="flex-1 p-4 lg:p-6">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:p-7">
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

      <CsatSurvey />
    </>
  );
}
