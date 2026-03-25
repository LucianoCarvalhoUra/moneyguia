import { ReactNode, useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import LGPDTermsModal from "@/components/LGPDTermsModal";
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
      
      if (!user) {
        setLgpdLoading(false);
        return;
      }

      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('accepted_terms')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data) {
        setShowLgpd(true);
      } else if (data.accepted_terms !== true) {
        setShowLgpd(true);
      }
    } catch (err) {
      console.error('[Layout] LGPD check error:', err);
      setShowLgpd(true);
    } finally {
      setLgpdLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLgpdTerms();
  }, [checkLgpdTerms]);

  const handleLgpdAccept = () => {
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
    </>
  );
}
