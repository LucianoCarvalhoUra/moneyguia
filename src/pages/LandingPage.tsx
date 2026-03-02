import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CandlestickChart,
  CreditCard,
  LayoutDashboard,
  Menu,
  PieChart,
  Shield,
  Target,
  TrendingUp,
  Wallet,
  X,
  Sparkles,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Painel de investimentos em tempo real",
    description: "Acompanhe evolução patrimonial, alocação e fluxo de caixa sem abrir planilhas.",
  },
  {
    icon: CreditCard,
    title: "Contas e cartões conectados",
    description: "Concentre movimentações em um painel único com leitura clara por ativo e passivo.",
  },
  {
    icon: PieChart,
    title: "Análise por carteira",
    description: "Visualize distribuição por categoria e identifique rapidamente onde otimizar.",
  },
  {
    icon: Bell,
    title: "Alertas estratégicos",
    description: "Receba alertas de vencimento e variações relevantes para decidir com antecedência.",
  },
  {
    icon: Target,
    title: "Metas financeiras guiadas",
    description: "Transforme objetivos em metas mensais com trilha de progresso e previsibilidade.",
  },
  {
    icon: TrendingUp,
    title: "Projeções inteligentes",
    description: "Use sinais de receita e despesa para antecipar cenários e oportunidades.",
  },
];

const testimonials = [
  {
    name: "Ricardo Silva",
    role: "Empresário",
    quote:
      "Consegui transformar meus números em decisões. Hoje enxergo caixa e investimento no mesmo painel.",
  },
  {
    name: "Mariana Costa",
    role: "Autônoma",
    quote:
      "A clareza visual me ajudou a organizar metas e eliminar gastos invisíveis no meu mês.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-700/40 bg-slate-900/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Wallet className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-100">KeepMoney</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#recursos" className="transition-colors hover:text-white">Recursos</a>
            <a href="#depoimentos" className="transition-colors hover:text-white">Depoimentos</a>
            <Link to="/plans" className="transition-colors hover:text-white">Planos</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth">
              <Button variant="ghost" className="text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white">
                Login
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-accent/90">Comece agora</Button>
            </Link>
          </div>

          <button className="rounded-md p-2 text-slate-100 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-700/40 bg-slate-900 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-300">Recursos</a>
              <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-300">Depoimentos</a>
              <Link to="/plans" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-300">Planos</Link>
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-700/40 pt-4">
                <Link to="/auth" className="text-center text-sm font-medium text-slate-200">Login</Link>
                <Link to="/auth">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Comece agora</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                Identity 1.0
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                Painel financeiro para quem toma decisão com dados
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-300">
                KeepMoney combina controle de caixa, visão de carteira e alertas estratégicos em uma experiência visual proprietária.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/auth">
                  <Button className="bg-accent px-8 py-6 text-base font-semibold text-accent-foreground hover:bg-accent/90">
                    Entrar no painel
                    <ArrowRight className="ml-2 h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </Link>
                <Link to="/plans">
                  <Button variant="outline" className="border-slate-500 bg-slate-900/40 px-8 py-6 text-base text-slate-100 hover:bg-slate-800">
                    Ver planos
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-md border border-slate-600/60 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-sm">
              <div className="grid gap-4">
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-300">Retorno consolidado</p>
                  <p className="mt-1 text-3xl font-bold text-white">+14,8%</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border border-slate-600 bg-slate-800/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Liquidez</p>
                    <p className="mt-2 text-xl font-semibold text-slate-100">R$ 28.400</p>
                  </div>
                  <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-300">IA Insights</p>
                    <p className="mt-2 text-xl font-semibold text-amber-200">3 sinais</p>
                  </div>
                </div>
                <div className="rounded-md border border-slate-600 bg-slate-800/70 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Alocação recomendada</span>
                    <CandlestickChart className="h-4 w-4 text-amber-300" strokeWidth={1.5} />
                  </div>
                  <div className="h-2 rounded-md bg-slate-700">
                    <div className="h-2 w-[68%] rounded-md bg-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="bg-slate-950 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Recursos</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">Controle com estética de produto premium</h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-md border border-slate-700 bg-slate-900/70 p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-800 text-amber-300">
                    <feature.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="depoimentos" className="bg-slate-900 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">Depoimentos Reais</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">Usuários que mudaram a relação com o dinheiro</h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {testimonials.map((item) => (
                <article key={item.name} className="rounded-md border border-slate-700 bg-slate-800/70 p-6">
                  <Quote className="h-6 w-6 text-amber-400" strokeWidth={1.5} />
                  <p className="mt-4 text-base leading-relaxed text-slate-200">"{item.quote}"</p>
                  <p className="mt-5 font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-slate-400">{item.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Shield className="mx-auto h-10 w-10 text-amber-400" strokeWidth={1.5} />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Segurança e performance no mesmo produto
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
              Estrutura técnica robusta, visual autoral e experiência orientada a decisões financeiras.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/auth">
                <Button className="bg-accent px-8 py-6 text-base font-semibold text-accent-foreground hover:bg-accent/90">
                  Acessar KeepMoney
                  <ArrowRight className="ml-2 h-5 w-5" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
