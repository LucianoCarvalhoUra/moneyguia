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
  CandlestickChart,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { path: "/goals", label: "Metas", icon: Target },
  { path: "/expenses", label: "Despesas", icon: Receipt },
  { path: "/incomes", label: "Receitas", icon: TrendingUp },
  { path: "/accounts", label: "Contas", icon: CreditCard },
  { path: "/reconciliation", label: "Conciliação", icon: FileCheck },
  { path: "/reports", label: "Relatórios", icon: FileText },
  { path: "/settings", label: "Configurações", icon: Settings },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-700/40 glass-sidebar">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Wallet className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300">Control Panel</p>
              <p className="text-base font-semibold text-slate-100">KeepMoney Invest</p>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-slate-300 hover:bg-slate-700/60 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-200">
              <CandlestickChart className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
              Investimento em foco
            </div>
            <span className="text-sm text-slate-300">
              Olá, <span className="font-semibold text-slate-100">{user?.user_metadata?.name?.split(" ")[0] || user?.email?.split("@")[0]}</span>
            </span>
            <Button variant="ghost" size="sm" className="text-slate-100 hover:bg-slate-700/70" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Sair
            </Button>
          </div>

          <button className="rounded-md p-2 text-slate-100 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="animate-slide-up border-t border-slate-700/40 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-accent text-accent-foreground"
                      : "text-slate-300 hover:bg-slate-700/60 hover:text-white",
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-slate-700/40 pt-3">
                <div className="px-4 text-sm text-slate-300">
                  Conectado como <span className="font-semibold text-slate-100">{user?.user_metadata?.name || user?.email}</span>
                </div>
                <Button variant="ghost" className="mt-2 w-full justify-start text-slate-100 hover:bg-slate-700/70" onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
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
