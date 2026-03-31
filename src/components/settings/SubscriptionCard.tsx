import { useUserPlan } from "@/hooks/useUserPlan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Clock, CalendarDays, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SubscriptionCard() {
  const { plan, subscription, isLoading } = useUserPlan();

  if (isLoading) return null;

  const isFree = plan.planType === "free";
  const expiresDate = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
  const startsDate = subscription?.startsAt ? new Date(subscription.startsAt) : null;
  const hasValidExpiration = Boolean(expiresDate && !Number.isNaN(expiresDate.getTime()));
  const diasRestantes = hasValidExpiration
    ? Math.ceil((expiresDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = subscription?.status === "expired" || (subscription?.daysUntilExpiration !== null && subscription.daysUntilExpiration <= 0);
  const isPending = !hasValidExpiration && !isExpired;
  const isExpiringSoon = subscription?.isExpiringSoon ?? false;
  const daysLeft = diasRestantes;

  const expiresFormatted = subscription?.expiresAt
    ? format(new Date(subscription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  // Progress bar percentage (30 day cycle)
  const progressPercent = (() => {
    if (!startsDate || !expiresDate) return 0;
    const total = new Date(expiresDate).getTime() - new Date(startsDate).getTime();
    const progresso = new Date().getTime() - new Date(startsDate).getTime();
    const percentual = !Number.isFinite(total) || total <= 0
      ? 0
      : Math.min(Math.max((progresso / total) * 100, 0), 100);

    console.log("[Barra] Início:", subscription?.startsAt, "Fim:", subscription?.expiresAt, "Percentual:", percentual);
    return percentual;
  })();

  const remainingPercent = Math.min(Math.max(100 - progressPercent, 0), 100);

  const statusColor = isExpired
    ? "text-destructive"
    : isPending
      ? "text-slate-300"
    : isExpiringSoon
      ? "text-amber-500"
      : "text-emerald-500";

  const statusBg = isExpired
    ? "bg-destructive/10"
    : isPending
      ? "bg-slate-500/10"
    : isExpiringSoon
      ? "bg-amber-500/10"
      : "bg-emerald-500/10";

  const barColor = isExpired
    ? "bg-destructive"
    : isPending
      ? "bg-slate-500"
    : isExpiringSoon
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Crown className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Seu Plano</p>
              <h3 className="text-lg font-bold">{plan.planName}</h3>
            </div>
          </div>
          <Badge
            className={`${statusBg} ${statusColor} border-0 font-semibold text-xs px-3 py-1`}
          >
            {isExpired ? "Expirado" : isPending ? "Pendente" : isExpiringSoon ? "Expirando" : isFree ? "Ativo" : "Ativo"}
          </Badge>
        </div>

        {/* Subscription details */}
        {!isFree && subscription && (
          <div className="px-6 pb-5 space-y-4">
            {/* Days remaining */}
            <div className="rounded-xl bg-white/5 backdrop-blur p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">Tempo restante</span>
                </div>
                <span className={`text-2xl font-bold tabular-nums ${statusColor}`}>
                  {isPending ? "Assinatura Pendente" : daysLeft !== null && daysLeft > 0 ? `Restam ${daysLeft} dias` : "Assinatura Expirada"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${remainingPercent}%` }}
                />
              </div>

              {/* Expiry date */}
              {expiresFormatted && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    Próxima cobrança: {format(new Date(subscription!.expiresAt!), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {!expiresFormatted && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Assinatura pendente</span>
                </div>
              )}
            </div>

            {/* Warning banner */}
            {isExpiringSoon && !isExpired && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Assinatura expirando!</p>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    Renove para manter acesso a todos os recursos do plano {plan.planName}.
                  </p>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Plano expirado</p>
                  <p className="text-xs text-red-300/70 mt-0.5">
                    Você está no plano gratuito. Renove para recuperar seus recursos.
                  </p>
                </div>
              </div>
            )}

            {/* Billing cycle */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{subscription.billingCycle === "yearly" ? "Renovação Anual" : "Renovação Mensal"}</span>
            </div>
          </div>
        )}

        {/* Free plan CTA */}
        {isFree && (
          <div className="px-6 pb-5">
            <div className="rounded-xl bg-white/5 backdrop-blur p-4 text-center space-y-3">
              <p className="text-sm text-slate-300">
                Faça upgrade para desbloquear IA, relatórios avançados e muito mais.
              </p>
              <Link to="/plans">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Ver Planos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Renew CTA for expired/expiring */}
        {!isFree && (isExpired || isExpiringSoon) && (
          <div className="px-6 pb-5">
            <Link to="/plans">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Renovar Assinatura
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
