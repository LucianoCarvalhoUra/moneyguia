import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Clock,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Receipt,
  Loader2,
  ShieldCheck,
  Zap,
  BarChart3,
  Target,
  Bell,
  FileText,
  Bot,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  billing_cycle: string;
  created_at: string;
  plan_name: string;
  plan_type: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprovado", color: "bg-emerald-500/10 text-emerald-600" },
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-600" },
  rejected: { label: "Recusado", color: "bg-red-500/10 text-red-600" },
  cancelled: { label: "Cancelado", color: "bg-slate-500/10 text-slate-500" },
};

export default function MySubscription() {
  const { user } = useAuth();
  const { plan, subscription, isLoading: planLoading } = useUserPlan();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const isFree = plan.planType === "free";
  const isExpired =
    subscription?.daysUntilExpiration !== null &&
    subscription?.daysUntilExpiration !== undefined &&
    subscription.daysUntilExpiration <= 0;
  const isExpiringSoon = subscription?.isExpiringSoon ?? false;
  const daysLeft = subscription?.daysUntilExpiration ?? null;

  const expiresFormatted = subscription?.expiresAt
    ? format(new Date(subscription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const progressPercent =
    daysLeft !== null && daysLeft > 0
      ? Math.max(0, Math.min(100, (daysLeft / (subscription?.billingCycle === "yearly" ? 365 : 30)) * 100))
      : 0;

  const barColor = isExpired
    ? "bg-red-500"
    : isExpiringSoon
      ? "bg-amber-500"
      : "bg-emerald-500";

  useEffect(() => {
    if (!user?.id) return;
    const fetchPayments = async () => {
      setLoadingPayments(true);
      const { data } = await supabase
        .from("payments")
        .select("id, amount, status, billing_cycle, created_at, subscription_plans(name, plan_type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setPayments(
          data.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            billing_cycle: p.billing_cycle,
            created_at: p.created_at,
            plan_name: p.subscription_plans?.name || "—",
            plan_type: p.subscription_plans?.plan_type || "free",
          }))
        );
      }
      setLoadingPayments(false);
    };
    fetchPayments();
  }, [user?.id]);

  const features = [
    { key: "hasAiClassification", label: "Classificação com IA", icon: Bot },
    { key: "hasAdvancedReports", label: "Relatórios avançados", icon: BarChart3 },
    { key: "hasExport", label: "Exportação de dados", icon: FileText },
    { key: "hasGoals", label: "Metas financeiras", icon: Target },
    { key: "hasNotifications", label: "Notificações", icon: Bell },
  ] as const;

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Assinatura</h1>
        <p className="text-muted-foreground">Gerencie seu plano e acompanhe pagamentos</p>
      </div>

      {/* Plan Card */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Crown className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Plano Atual</p>
                <h3 className="text-xl font-bold">{plan.planName}</h3>
              </div>
            </div>
            <Badge
              className={`border-0 font-semibold text-xs px-3 py-1 ${
                isExpired
                  ? "bg-red-500/20 text-red-300"
                  : isExpiringSoon
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {isExpired ? "Expirado" : isFree ? "Ativo" : "Ativo"}
            </Badge>
          </div>

          {/* Subscription details */}
          {!isFree && subscription && (
            <div className="px-6 pb-6 space-y-4">
              <div className="rounded-2xl bg-white/5 backdrop-blur p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Tempo restante</span>
                  </div>
                  <span className={`text-3xl font-bold tabular-nums ${isExpired ? "text-red-400" : isExpiringSoon ? "text-amber-400" : "text-emerald-400"}`}>
                    {daysLeft !== null && daysLeft > 0 ? daysLeft : 0}
                    <span className="text-sm font-normal text-slate-400 ml-1">dias</span>
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  {expiresFormatted && (
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{isExpired ? "Expirou em " : "Expira em "}{expiresFormatted}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Ciclo {subscription.billingCycle === "yearly" ? "anual" : "mensal"}</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              {(isExpiringSoon || isExpired) && (
                <div className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  isExpired
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-amber-500/10 border-amber-500/20"
                }`}>
                  <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${isExpired ? "text-red-400" : "text-amber-400"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isExpired ? "text-red-300" : "text-amber-300"}`}>
                      {isExpired ? "Plano expirado" : "Assinatura expirando!"}
                    </p>
                    <p className={`text-xs mt-0.5 ${isExpired ? "text-red-300/70" : "text-amber-300/70"}`}>
                      {isExpired
                        ? "Você está no plano gratuito. Renove para recuperar seus recursos."
                        : `Renove para manter acesso completo ao plano ${plan.planName}.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="px-6 pb-6">
            <Link to="/plans">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 text-sm">
                {isFree ? "Fazer Upgrade" : isExpired || isExpiringSoon ? "Renovar Assinatura" : "Alterar Plano"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-primary" />
            Recursos do seu plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(({ key, label, icon: Icon }) => {
              const active = plan[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    active
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-slate-200 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-slate-800/30"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    active ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400" : "bg-slate-200 text-slate-400 dark:bg-slate-700"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                  </div>
                  {active ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Limits */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Despesas/mês", value: plan.maxExpensesPerMonth ?? "∞" },
              { label: "Receitas/mês", value: plan.maxIncomesPerMonth ?? "∞" },
              { label: "Categorias", value: plan.maxCategories ?? "∞" },
              { label: "Cartões", value: plan.maxCreditCards ?? "∞" },
              { label: "Contas", value: plan.maxBankAccounts ?? "∞" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-primary" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Seus últimos pagamentos realizados</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Seus pagamentos aparecerão aqui após a contratação de um plano.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const st = statusMap[payment.status] || statusMap.pending;
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <CreditCard className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{payment.plan_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {" • "}
                          {payment.billing_cycle === "yearly" ? "Anual" : "Mensal"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`border-0 text-xs font-medium ${st.color}`}>
                        {st.label}
                      </Badge>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        R$ {payment.amount.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
