import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Lock, Sparkles, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";

const monthlyPlans = {
  essencial: "R$ 0",
  premium: "R$ 29",
  total: "R$ 59",
};

const yearlyPlans = {
  essencial: "R$ 0",
  premium: "R$ 24",
  total: "R$ 49",
};

export default function Planos() {
  const [yearlyBilling, setYearlyBilling] = useState(false);
  const [searchParams] = useSearchParams();
  const { isAuthenticated, subscriptionPlan, subscriptionStatus } = useAuth();

  const prices = yearlyBilling ? yearlyPlans : monthlyPlans;
  const periodLabel = yearlyBilling ? "/mes no anual" : "/mes";
  const reason = searchParams.get("reason");
  const feature = searchParams.get("feature");

  const bannerMessage = useMemo(() => {
    if (reason === "expired") {
      return "Assinatura expirada. Ative um plano para continuar usando o sistema.";
    }
    if (reason === "upgrade_required" && feature === "advanced_reports") {
      return "Relatorios avancados exigem o plano Controle Total.";
    }
    if (reason === "upgrade_required" && feature === "ai_classification") {
      return "Classificacao com IA exige plano Premium ou Controle Total.";
    }
    if (reason === "upgrade_required" && feature === "extra_control") {
      return "Controle Extra exige o plano Controle Total.";
    }
    return null;
  }, [reason, feature]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Escolha o plano ideal para seu momento</h1>
          <p className="mt-3 text-slate-600">Desbloqueie recursos premium e evolua o controle financeiro com IA.</p>
          {bannerMessage && (
            <div className="mx-auto mt-5 flex max-w-2xl items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Lock className="h-4 w-4" />
              <span>{bannerMessage}</span>
            </div>
          )}
        </div>

        <div className="mb-10 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <span className={`text-sm font-medium ${!yearlyBilling ? "text-slate-900" : "text-slate-500"}`}>Mensal</span>
          <Switch checked={yearlyBilling} onCheckedChange={setYearlyBilling} />
          <span className={`text-sm font-medium ${yearlyBilling ? "text-slate-900" : "text-slate-500"}`}>Anual</span>
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Economize ate 20%</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <CardHeader>
              <CardTitle>Essencial</CardTitle>
              <CardDescription>Para quem está começando</CardDescription>
              <p className="text-4xl font-bold">{prices.essencial}</p>
              <p className="text-sm text-slate-500">{periodLabel}</p>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Controle de receitas e despesas</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Dashboard basico</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Metas financeiras</li>
              </ul>
              <Link to="/auth" className="block">
                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">Assinar Agora</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-emerald-500 bg-white shadow-xl shadow-emerald-200/60">
            <Badge className="absolute -top-3 left-6 bg-emerald-600 text-white hover:bg-emerald-600">Mais Popular</Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Pro
              </CardTitle>
              <CardDescription>Relatórios avançados e mais controle</CardDescription>
              <p className="text-4xl font-bold">{prices.premium}</p>
              <p className="text-sm text-slate-500">{periodLabel}</p>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Tudo do Essencial</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Relatórios avançados</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Metas financeiras</li>
              </ul>
              <Link to="/auth" className="block">
                <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700">Assinar Agora</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-700" />
                Premium
              </CardTitle>
              <CardDescription>Experiência completa com IA e controle total</CardDescription>
              <p className="text-4xl font-bold">{prices.total}</p>
              <p className="text-sm text-slate-500">{periodLabel}</p>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Tudo do Premium</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Relatorios avancados</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Controle Extra e exportacoes</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />Multiplos usuarios</li>
              </ul>
              <Link to="/auth" className="block">
                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">Assinar Agora</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {isAuthenticated && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Status atual da assinatura
            </div>
            <p>Plano: <strong>{subscriptionPlan}</strong></p>
            <p>Status: <strong>{subscriptionStatus}</strong></p>
            <Link to="/dashboard" className="mt-4 inline-block">
              <Button variant="outline">Voltar ao sistema</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
