import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicHeader from "@/components/layout/PublicHeader";

const features = [
  {
    icon: Sparkles,
    title: "Automação inteligente",
    description: "A IA categoriza transações e sugere ajustes com base no seu histórico financeiro.",
  },
  {
    icon: TrendingUp,
    title: "Dashboard legível",
    description: "Visualizações claras para acompanhar receitas, despesas e metas sem ruído visual.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e governança",
    description: "Estrutura robusta para proteger dados e manter sua operação financeira confiável.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <PublicHeader />

      <main>
        <section className="py-16 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                <Sparkles className="h-4 w-4" />
                IA Financeira
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#1e293b] md:text-5xl lg:text-6xl">
                Domine suas Finanças com Inteligência Artificial
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[#64748b]">
                O controle orçamentário que aprende com seus hábitos e automatiza sua gestão financeira.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row items-start sm:items-center">
                <Link to="/plans">
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600 px-8 py-4 text-lg font-bold text-white rounded-full shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    Vamos Começar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground pl-2">
                  Sem cartão de crédito. Grátis para sempre.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-[#64748b]">Crescimento projetado</p>
                  <p className="mt-1 text-3xl font-bold text-[#059669]">+18,2%</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    <p className="mt-3 text-sm font-semibold text-[#1e293b]">Segurança ativa</p>
                    <p className="text-xs text-[#64748b]">Proteção multicamada para seus dados.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <TrendingUp className="h-5 w-5 text-[#059669]" />
                    <p className="mt-3 text-sm font-semibold text-[#1e293b]">Metas em alta</p>
                    <p className="text-xs text-[#64748b]">Evolução monitorada em tempo real.</p>
                  </div>
                </div>
                <div className="h-36 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-4">
                  <div className="h-full rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-[#64748b]">
                      <span>Mockup abstrato 3D</span>
                      <span className="text-amber-600">IA</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-[74%] rounded-full bg-[#059669]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#059669]">Recursos</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1e293b] md:text-4xl">Clareza visual e decisões melhores</h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-[#059669]">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#1e293b]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="seguranca" className="pb-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
              <ShieldCheck className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#1e293b] md:text-4xl">
                Segurança e crescimento no mesmo painel
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#64748b]">
                Um sistema moderno, com excelente legibilidade, pronto para apoiar sua estratégia financeira.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
