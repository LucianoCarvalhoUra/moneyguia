import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  CreditCard,
  FileCheck,
  FileText,
  Target,
  Sparkles,
  Settings,
  LogOut,
  Shield,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";
...
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const { plan } = useUserPlan();
  const { isAdmin, isCheckingAdmin } = useIsAdmin();

  const allBottomItems = !isCheckingAdmin && isAdmin
    ? [
        ...bottomItems,
        { path: "/admin", label: "Admin", icon: Shield },
        { path: "/admin/csat", label: "CSAT", icon: MessageSquare },
      ]
    : bottomItems;

  const planLabel = plan.planType === "free" ? "Essencial" : plan.planType === "pro" ? "Pro" : "Premium";
  const isAiActive = plan.hasAiClassification;
  const userName = user?.user_metadata?.name?.split(" ")[0] || user?.email?.split("@")[0];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">MoneyGuia</p>
              <p className="text-sm font-semibold text-foreground">Painel Financeiro</p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.path}
                      end
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        {!collapsed && (
          <NavLink
            to="/plans"
            className={cn(
              "mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              isAiActive
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {planLabel} • {isAiActive ? "IA ativa" : "IA inativa"}
          </NavLink>
        )}

        <SidebarMenu>
          {allBottomItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild tooltip={item.label}>
                <NavLink
                  to={item.path}
                  end
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                  activeClassName="bg-primary/10 text-primary font-semibold"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="mt-3 border-t border-border pt-3">
          {!collapsed && (
            <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
              Olá, <span className="font-semibold text-foreground">{userName}</span>
            </p>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sair"
                onClick={() => logout()}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
