import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  Wallet,
  Bot,
  BarChart3,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const features = [
  {
    icon: Bot,
    title: "Automação inteligente",
    description: "A IA categoriza transações e sugere ajustes com base no seu histórico financeiro.",
  },
  {
    icon: BarChart3,
    title: "Dashboard legível",
    description: "Visualizações claras para acompanhar receitas, despesas e metas sem ruído visual.",
  },
  {
    icon: Landmark,
    title: "Segurança e governança",
    description: "Estrutura robusta para proteger dados e manter sua operação financeira confiável.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#059669] text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1e293b]">MoneyGuia</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#64748b] md:flex">
            <a href="#recursos" className="transition-colors hover:text-[#1e293b]">Recursos</a>
            <a href="#seguranca" className="transition-colors hover:text-[#1e293b]">Segurança</a>
            <Link to="/plans" className="transition-colors hover:text-[#1e293b]">Planos</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth">
              <Button variant="ghost" className="text-sm font-medium text-[#1e293b]">Login</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-[#059669] px-6 text-sm font-semibold text-white hover:bg-[#047857]">Começar</Button>
            </Link>
          </div>

          <button className="rounded-lg p-2 text-[#1e293b] md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-[#64748b]">Recursos</a>
              <a href="#seguranca" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-[#64748b]">Segurança</a>
              <Link to="/plans" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-[#64748b]">Planos</Link>
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4">
                <Link to="/auth" className="text-center text-sm font-medium text-[#1e293b]">Login</Link>
                <Link to="/auth">
                  <Button className="w-full bg-[#059669] text-white hover:bg-[#047857]">Começar</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

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
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/auth">
                  <Button className="bg-[#059669] px-8 py-6 text-base font-semibold text-white hover:bg-[#047857]">
                    Acessar plataforma
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/plans">
                  <Button variant="outline" className="px-8 py-6 text-base">
                    Conhecer planos
                  </Button>
                </Link>
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
