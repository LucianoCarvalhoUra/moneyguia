import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
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
  );
}
