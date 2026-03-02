import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, X, ArrowRight, Wallet, Zap, Menu, X as XIcon } from "lucide-react";
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
            .sort((a: Plan, b: Plan) => planOrder.indexOf(a.plan_type) - planOrder.indexOf(b.plan_type))
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
      // Free plan: activate directly if logged in
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
              { onConflict: "user_id" }
            );
          if (error) throw error;
          setCurrentPlanType(plan.plan_type);
          toast.success("Plano gratuito ativado!");
        } catch (err: any) {
          toast.error("Erro: " + err.message);
        }
      };
      activateFree();
      return;
    }

    // Paid plan: go to checkout
    const cycle = isYearly ? "yearly" : "monthly";
    navigate(`/checkout?plan=${plan.id}&cycle=${cycle}`);
  };

  const getDiscount = (plan: Plan) => {
    if (plan.price_monthly === 0) return 0;
    const yearlyMonthly = plan.price_yearly / 12;
    return Math.round((1 - yearlyMonthly / plan.price_monthly) * 100);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">KeepMoney</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <Link to="/" className="transition-colors hover:text-gray-900">InÃ­cio</Link>
            <Link to="/plans" className="text-indigo-700 font-semibold">Planos</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth">
              <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-gray-900">Login</Button>
            </Link>
            <Link to="/auth">
              <Button className="rounded-md bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700">Comece jÃ¡</Button>
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-gray-600">InÃ­cio</Link>
              <Link to="/plans" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-semibold text-indigo-700">Planos</Link>
              <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-4">
                <Link to="/auth" className="text-center text-sm font-medium text-gray-700">Login</Link>
                <Link to="/auth">
                  <Button className="w-full rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Comece jÃ¡</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl">
              Confira nossos planos e escolha a melhor forma de cuidar do seu dinheiro
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              Aproveite os planos KeepMoney e experimente um controle como vocÃª nunca viu.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!isYearly ? "text-gray-900" : "text-gray-500"}`}>Mensal</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm font-medium ${isYearly ? "text-gray-900" : "text-gray-500"}`}>Anual</span>
            </div>
          </div>
        </section>

        {/* Plans Grid */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          {loading ? (
            <div className="text-center text-gray-500">Carregando planos...</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const isPopular = plan.plan_type === "pro";
                const isCurrent = plan.plan_type === currentPlanType;
                const discount = getDiscount(plan);
                const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border-2 p-8 transition-all ${
                      isPopular
                        ? "border-indigo-500 bg-white shadow-xl shadow-indigo-100/60"
                        : "border-gray-200 bg-white shadow-sm hover:border-indigo-200 hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-6 bg-indigo-600 text-white hover:bg-indigo-600">
                        Mais popular
                      </Badge>
                    )}

                    {isCurrent && (
                      <Badge className="absolute -top-3 right-6 bg-gray-800 text-white hover:bg-gray-800">
                        Plano atual
                      </Badge>
                    )}

                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 text-sm text-gray-500">{plan.description}</p>

                    {/* Price */}
                    <div className="mt-6">
                      {plan.price_monthly === 0 ? (
                        <div className="text-4xl font-extrabold text-gray-900">GrÃ¡tis</div>
                      ) : (
                        <>
                          {isYearly && (
                            <p className="text-sm text-gray-400 line-through">
                              R$ {plan.price_monthly.toFixed(2).replace(".", ",")}/mÃªs
                            </p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-gray-900">
                              R$ {price.toFixed(2).replace(".", ",")}
                            </span>
                            <span className="text-sm text-gray-500">/mÃªs</span>
                          </div>
                          {isYearly && (
                            <p className="mt-1 text-xs text-gray-500">
                              ou R$ {plan.price_yearly.toFixed(2).replace(".", ",")} Ã  vista
                            </p>
                          )}
                          {isYearly && discount > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                              <Zap className="h-3 w-3" />
                              {discount}% OFF
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="mt-8 flex-1 space-y-3">
                      {plan.features.map((feature: string, i: number) => {
                        const isNegative = feature.startsWith("Sem ");
                        return (
                          <li key={i} className="flex items-start gap-3">
                            {isNegative ? (
                              <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300" />
                            ) : (
                              <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isPopular ? "text-indigo-600" : "text-gray-400"}`} />
                            )}
                            <span className={`text-sm ${isNegative ? "text-gray-400" : "text-gray-600"}`}>
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* CTA */}
                    <div className="mt-8">
                      {isCurrent ? (
                        <Button disabled className="w-full rounded-md bg-gray-100 text-gray-500">
                          Plano atual
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full rounded-md ${
                            isPopular
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                              : "bg-gray-900 text-white hover:bg-gray-800"
                          }`}
                        >
                          {plan.price_monthly === 0 ? "ComeÃ§ar grÃ¡tis" : `Assinar ${plan.name}`}
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

        {/* CTA Bottom */}
        <section className="bg-gradient-to-br from-indigo-600 to-cyan-600 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Alcance o bem-estar financeiro com o KeepMoney!
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Comece gratuitamente e faÃ§a upgrade quando estiver pronto.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button className="rounded-md bg-white px-8 py-6 text-base font-semibold text-indigo-700 shadow-lg hover:bg-gray-50">
                ComeÃ§ar agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Wallet className="h-4 w-4" />
              </div>
              <span className="font-bold text-gray-900">KeepMoney</span>
            </div>
            <p className="text-sm text-gray-500">Â© 2026 KeepMoney. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

