// Public Header - Componente de navegação pública
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  price_monthly: number;
}

const planOrder = ["free", "pro", "premium"];

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";
  const isPlans = location.pathname === "/plans";

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id, name, plan_type, price_monthly")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (data) {
        const sortedPlans = data.sort(
          (a, b) => planOrder.indexOf(a.plan_type) - planOrder.indexOf(b.plan_type)
        );
        setPlans(sortedPlans);
        if (sortedPlans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(sortedPlans[0].id);
        }
      }
    };

    fetchPlans();
  }, [selectedPlanId]);

  const handleNavigation = (section: string) => {
    setMobileMenuOpen(false);
    
    if (isHome) {
      // If on home, scroll to section
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // If on other page, navigate to home with hash
      navigate(`/#${section}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#059669] text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1e293b]">MoneyGuia</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#64748b] md:flex">
          <button
            onClick={() => handleNavigation("recursos")}
            className="transition-colors hover:text-[#1e293b]"
          >
            Recursos
          </button>
          <button
            onClick={() => handleNavigation("seguranca")}
            className="transition-colors hover:text-[#1e293b]"
          >
            Segurança
          </button>
          <Link
            to="/plans"
            className={cn(
              "transition-colors hover:text-[#1e293b]",
              isPlans && "text-[#1e293b] font-semibold"
            )}
          >
            Planos
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <Link to="/dashboard">
              <Button variant="outline" className="text-sm font-medium">
                <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                Voltar ao painel
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors mr-6">
                Entrar
              </Link>
              <Link to={selectedPlanId ? `/checkout?plan=${selectedPlanId}&cycle=${isYearly ? 'yearly' : 'monthly'}` : "/plans"}>
                <Button className="bg-[#059669] px-8 text-base font-bold text-white hover:bg-[#047857] shadow-lg shadow-emerald-200">
                  Vamos Começar
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="rounded-lg p-2 text-[#1e293b] md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {!user && (
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-left text-sm font-semibold text-emerald-600 border-b border-slate-100"
              >
                Entrar
              </Link>
            )}
            <button
              onClick={() => handleNavigation("recursos")}
              className="py-2 text-left text-sm font-medium text-[#64748b]"
            >
              Recursos
            </button>
            <button
              onClick={() => handleNavigation("seguranca")}
              className="py-2 text-left text-sm font-medium text-[#64748b]"
            >
              Segurança
            </button>
            <Link
              to="/plans"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "py-2 text-sm font-medium",
                isPlans ? "text-[#1e293b] font-semibold" : "text-[#64748b]"
              )}
            >
              Planos
            </Link>
            <div className="mt-2 pt-4 border-t border-slate-200">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center"
                >
                  <Button variant="outline" className="w-full">
                    <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                    Voltar ao painel
                  </Button>
                </Link>
              ) : (
                <Link
                  to={selectedPlanId ? `/checkout?plan=${selectedPlanId}&cycle=${isYearly ? 'yearly' : 'monthly'}` : "/plans"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-[#059669] text-white hover:bg-[#047857] font-semibold">
                    Vamos Começar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
