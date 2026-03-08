import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, X, ArrowRight, ArrowDown, Wallet, Zap, Menu, X as XIcon, Sparkles, Crown, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const planIcons: Record<string, typeof Shield> = {
  free: Shield,
  pro: Sparkles,
  premium: Crown,
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
          window.dispatchEvent(new Event("user-plan-changed"));
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

  const currentPlanIndex = planOrder.indexOf(currentPlanType);

  const getButtonInfo = (plan: Plan) => {
    const planIndex = planOrder.indexOf(plan.plan_type);
    const isCurrent = plan.plan_type === currentPlanType;

    if (isCurrent) return { label: "Plano atual", variant: "current" as const };
    if (planIndex > currentPlanIndex) return { label: "Fazer upgrade", variant: "upgrade" as const };
    return { label: "Fazer downgrade", variant: "downgrade" as const };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-foreground">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">KeepMoney</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/" className="transition-colors hover:text-foreground">Início</Link>
            <Link to="/plans" className="font-semibold text-primary">Planos</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/dashboard">
                <Button variant="outline" className="text-sm font-medium">Voltar ao painel</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-sm font-medium">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Começar</Button>
                </Link>
              </>
            )}
          </div>

          <button className="rounded-lg p-2 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <main>
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Escolha o plano ideal para você
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Evolua seu controle financeiro com previsibilidade, eficiência e inteligência.
            </p>

            {user && currentPlanType !== "free" && (
              <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary">
                <Crown className="h-4 w-4" />
                Você está no plano {planLabels[currentPlanType] || currentPlanType}
              </div>
            )}

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2.5 shadow-sm">
              <span className={cn("text-sm font-medium transition-colors", !isYearly ? "text-foreground" : "text-muted-foreground")}>Mensal</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={cn("text-sm font-medium transition-colors", isYearly ? "text-foreground" : "text-muted-foreground")}>Anual</span>
              {isYearly && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                  <Zap className="mr-1 h-3 w-3" />
                  Economize até 33%
                </Badge>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          {loading ? (
            <div className="text-center text-muted-foreground">Carregando planos...</div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = plan.plan_type === currentPlanType;
                const isPremium = plan.plan_type === "premium";
                const discount = getDiscount(plan);
                const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly;
                const title = planLabels[plan.plan_type] ?? plan.name;
                const description = planDescriptions[plan.plan_type] ?? plan.description;
                const PlanIcon = planIcons[plan.plan_type] || Shield;
                const buttonInfo = getButtonInfo(plan);

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border-2 p-8 transition-all duration-300",
                      isCurrent
                        ? "border-primary bg-primary/[0.02] shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                        : isPremium
                          ? "border-amber-300 bg-gradient-to-b from-amber-50/50 to-white shadow-md hover:shadow-lg hover:-translate-y-1"
                          : "border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-1",
                    )}
                  >
                    {/* Badges */}
                    <div className="absolute -top-3 left-0 right-0 flex justify-center gap-2">
                      {isPremium && !isCurrent && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500 shadow-sm">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Mais completo
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary shadow-sm">
                          <Check className="mr-1 h-3 w-3" />
                          Seu plano atual
                        </Badge>
                      )}
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        isCurrent ? "bg-primary text-primary-foreground" : isPremium ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
                      )}>
                        <PlanIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{title}</h3>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{description}</p>

                    {/* Price */}
                    <div className="mt-6 pb-6 border-b border-dashed border-slate-200">
                      {plan.price_monthly === 0 ? (
                        <div>
                          <span className="text-4xl font-extrabold">Grátis</span>
                          <span className="ml-1 text-sm text-muted-foreground">para sempre</span>
                        </div>
                      ) : (
                        <>
                          {isYearly && (
                            <p className="text-sm text-muted-foreground line-through">
                              R$ {plan.price_monthly.toFixed(2).replace(".", ",")}/mês
                            </p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold">
                              R$ {price.toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                          </div>
                          {isYearly && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              ou R$ {plan.price_yearly.toFixed(2).replace(".", ",")} à vista
                            </p>
                          )}
                          {isYearly && discount > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              <Zap className="h-3 w-3" />
                              {discount}% OFF
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features.map((feature: string, i: number) => {
                        const isNegative = feature.startsWith("Sem ");
                        return (
                          <li key={i} className="flex items-start gap-3">
                            {isNegative ? (
                              <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
                            ) : (
                              <Check className={cn(
                                "mt-0.5 h-4 w-4 flex-shrink-0",
                                isCurrent ? "text-primary" : isPremium ? "text-amber-500" : "text-emerald-500"
                              )} />
                            )}
                            <span className={cn("text-sm", isNegative ? "text-slate-400" : "text-muted-foreground")}>
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Action Button */}
                    <div className="mt-8">
                      {buttonInfo.variant === "current" ? (
                        <Button disabled className="w-full rounded-xl bg-primary/10 text-primary border border-primary/20 cursor-default">
                          <Check className="mr-2 h-4 w-4" />
                          Plano atual
                        </Button>
                      ) : buttonInfo.variant === "upgrade" ? (
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          className={cn(
                            "w-full rounded-xl font-semibold",
                            isPremium
                              ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Fazer upgrade
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => handleSelectPlan(plan)}
                          className="w-full rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <ArrowDown className="mr-2 h-4 w-4" />
                          Fazer downgrade
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Back to dashboard for logged users */}
          {user && (
            <div className="mt-12 text-center">
              <Link to="/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                  Voltar ao painel financeiro
                </Button>
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
