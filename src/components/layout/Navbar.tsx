import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  CreditCard,
  FileCheck,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  FileText,
  Target,
  Sparkles,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/goals", label: "Metas", icon: Target },
  { path: "/expenses", label: "Despesas", icon: Receipt },
  { path: "/incomes", label: "Receitas", icon: TrendingUp },
  { path: "/accounts", label: "Contas", icon: CreditCard },
  { path: "/reconciliation", label: "Cartão", icon: FileCheck },
  { path: "/reports", label: "Relatórios", icon: FileText },
  { path: "/subscription", label: "Assinatura", icon: Sparkles },
  { path: "/settings", label: "Configurações", icon: Settings },
];

const MASTER_EMAIL = "lucianocarvalhoura@gmail.com";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { plan } = useUserPlan();

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL;
  const allNavItems = isMaster
    ? [...navItems, { path: "/admin", label: "Admin", icon: Shield }]
    : navItems;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">MoneyGuia</p>
              <p className="text-sm font-semibold text-slate-800">Painel Financeiro</p>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {(() => {
              const isAiActive = plan.hasAiClassification;
              const planLabel = plan.planType === 'free' ? 'Essencial' : plan.planType === 'pro' ? 'Pro' : 'Premium';
              return (
                <Link to="/plans" className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  isAiActive 
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" 
                    : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                )}>
                  <Sparkles className="h-4 w-4" />
                  {planLabel} • {isAiActive ? "IA ativa" : "IA inativa"}
                </Link>
              );
            })()}
            <span className="text-sm text-slate-600">
              Olá, <span className="font-semibold text-slate-800">{user?.user_metadata?.name?.split(" ")[0] || user?.email?.split("@")[0]}</span>
            </span>
            <Button variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>

          <button className="rounded-lg p-2 text-slate-700 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-slate-200 pt-3">
                <div className="px-4 text-sm text-slate-600">
                  Conectado como <span className="font-semibold text-slate-800">{user?.user_metadata?.name || user?.email}</span>
                </div>
                <Button variant="ghost" className="mt-2 w-full justify-start text-slate-700 hover:bg-slate-100" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
