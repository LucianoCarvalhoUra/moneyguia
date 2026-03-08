import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, X, ArrowRight, Wallet, Zap, Menu, X as XIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
  features: string[];
  is_active: boolean;
}

const planOrder = ["free", "pro", "premium"];

const planLabels: Record<string, string> = {
  free: "Essencial",
  pro: "Pro",
  premium: "Premium",
};

const planDescriptions: Record<string, string> = {
  free: "Ideal para começar o controle financeiro com organização e simplicidade.",
  pro: "Para quem busca análises estratégicas e relatórios avançados.",
  premium: "Gestão completa com inteligência artificial, exportação e controle total.",
};

export default function Plans() {
  const [isYearly, setIsYearly] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlanType, setCurrentPlanType] = useState<string>("free");

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (data) {
        setPlans(
          data
            .map((p: any) => ({
              ...p,
              features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
            }))
            .sort((a: Plan, b: Plan) => planOrder.indexOf(a.plan_type) - planOrder.indexOf(b.plan_type)),
        );
      }
      setLoading(false);
    };

    const fetchUserPlan = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_subscriptions")
        .select("subscription_plans(plan_type)")
        .eq("user_id", user.id)
        .in("status", ["active", "trial"])
        .maybeSingle();
      if (data?.subscription_plans) {
        setCurrentPlanType((data.subscription_plans as any).plan_type);
      }
    };

    fetchPlans();
    fetchUserPlan();
  }, [user]);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.plan_type === currentPlanType) return;

    if (plan.price_monthly === 0) {
      if (!user) {
        navigate("/auth");
        return;
      }
      const activateFree = async () => {
        try {
          const { error } = await supabase
            .from("user_subscriptions")
            .upsert(
              {
                user_id: user.id,
                plan_id: plan.id,
                billing_cycle: "monthly",
                status: "active",
                starts_at: new Date().toISOString(),
                expires_at: null,
              },
              { onConflict: "user_id" },
            );
          if (error) throw error;
          setCurrentPlanType(plan.plan_type);
          toast.success("Plano Essencial ativado com sucesso.");
        } catch (err: any) {
          toast.error("Erro ao ativar plano: " + err.message);
        }
      };
      activateFree();
      return;
    }

    const cycle = isYearly ? "yearly" : "monthly";
    navigate(`/checkout?plan=${plan.id}&cycle=${cycle}`);
  };

  const getDiscount = (plan: Plan) => {
    if (plan.price_monthly === 0) return 0;
    const yearlyMonthly = plan.price_yearly / 12;
    return Math.round((1 - yearlyMonthly / plan.price_monthly) * 100);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#059669] text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1e293b]">KeepMoney</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#64748b] md:flex">
            <Link to="/" className="transition-colors hover:text-[#1e293b]">Início</Link>
            <Link to="/plans" className="font-semibold text-[#059669]">Planos</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth">
              <Button variant="ghost" className="text-sm font-medium text-[#1e293b]">Login</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-[#059669] px-6 text-sm font-semibold text-white hover:bg-[#047857]">Começar</Button>
            </Link>
          </div>

          <button className="rounded-lg p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <main>
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#1e293b] md:text-5xl">
              Planos claros para diferentes estágios da sua gestão financeira
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#64748b]">
              Escolha o plano ideal para evoluir com previsibilidade, eficiência e inteligência.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!isYearly ? "text-[#1e293b]" : "text-[#64748b]"}`}>Mensal</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm font-medium ${isYearly ? "text-[#1e293b]" : "text-[#64748b]"}`}>Anual</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          {loading ? (
            <div className="text-center text-[#64748b]">Carregando planos...</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const isPopular = plan.plan_type === "pro";
                const isCurrent = plan.plan_type === currentPlanType;
                const discount = getDiscount(plan);
                const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly;
                const title = planLabels[plan.plan_type] ?? plan.name;
                const description = planDescriptions[plan.plan_type] ?? plan.description;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
                      isPopular ? "border-amber-300 bg-white" : "border-slate-200 bg-white"
                    }`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-6 bg-amber-500 text-white hover:bg-amber-500">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Mais recomendado
                      </Badge>
                    )}

                    {isCurrent && (
                      <Badge className="absolute -top-3 right-6 bg-slate-800 text-white hover:bg-slate-800">
                        Plano atual
                      </Badge>
                    )}

                    <h3 className="text-xl font-bold text-[#1e293b]">{title}</h3>
                    <p className="mt-2 text-sm text-[#64748b]">{description}</p>

                    <div className="mt-6">
                      {plan.price_monthly === 0 ? (
                        <div className="text-4xl font-extrabold text-[#1e293b]">Gratuito</div>
                      ) : (
                        <>
                          {isYearly && (
                            <p className="text-sm text-slate-400 line-through">
                              R$ {plan.price_monthly.toFixed(2).replace(".", ",")}/mês
                            </p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-[#1e293b]">
                              R$ {price.toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-sm text-[#64748b]">/mês</span>
                          </div>
                          {isYearly && (
                            <p className="mt-1 text-xs text-[#64748b]">
                              ou R$ {plan.price_yearly.toFixed(2).replace(".", ",")} à vista
                            </p>
                          )}
                          {isYearly && discount > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Zap className="h-3 w-3" />
                              {discount}% OFF
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <ul className="mt-8 flex-1 space-y-3">
                      {plan.features.map((feature: string, i: number) => {
                        const isNegative = feature.startsWith("Sem ");
                        return (
                          <li key={i} className="flex items-start gap-3">
                            {isNegative ? (
                              <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
                            ) : (
                              <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isPopular ? "text-amber-500" : "text-[#059669]"}`} />
                            )}
                            <span className={`text-sm ${isNegative ? "text-slate-400" : "text-[#64748b]"}`}>
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-8">
                      {isCurrent ? (
                        <Button disabled className="w-full rounded-lg bg-slate-100 text-slate-500">
                          Plano atual
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full rounded-lg ${
                            isPopular ? "bg-[#059669] text-white hover:bg-[#047857]" : "bg-slate-800 text-white hover:bg-slate-700"
                          }`}
                        >
                          {plan.price_monthly === 0 ? "Ativar gratuito" : "Assinar plano"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
