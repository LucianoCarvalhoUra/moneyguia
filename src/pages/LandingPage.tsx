import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Brain, Check, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Basico",
    price: "Gratis",
    description: "Ideal para comecar o controle financeiro.",
    features: ["Lancamentos essenciais", "Resumo mensal", "Suporte padrao"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 29/m",
    description: "Mais inteligencia e produtividade no dia a dia.",
    features: ["Tudo do Basico", "Classificacao com IA", "Relatorios avancados", "Prioridade no suporte"],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "R$ 59/m",
    description: "Escala para familias e controle colaborativo.",
    features: ["Tudo do Pro", "Exportacao de dados", "Multiplos usuarios", "Acompanhamento compartilhado"],
    highlighted: false,
  },
];

const testimonials = [
  {
    name: "Carla M.",
    quote: "Em duas semanas eu finalmente visualizei para onde meu dinheiro estava indo.",
  },
  {
    name: "Rafael S.",
    quote: "A IA economizou muito tempo na classificacao das transacoes.",
  },
  {
    name: "Patricia L.",
    quote: "A interface e simples e objetiva. Ficou facil manter consistencia.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">KeepMoney</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a href="#funcionalidades" className="transition-colors hover:text-slate-900">
              Funcionalidades
            </a>
            <a href="#precos" className="transition-colors hover:text-slate-900">
              Precos
            </a>
            <Link to="/auth">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">Entrar no Sistema</Button>
            </Link>
          </nav>

          <Link to="/auth" className="md:hidden">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-7">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">Controle financeiro com IA</Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Domine suas financas com Inteligencia Artificial
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Organize receitas e despesas, receba insights praticos e tome decisoes melhores com uma plataforma
              desenhada para clareza e crescimento financeiro.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
                  Acessar Sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#precos">
                <Button size="lg" variant="outline" className="w-full border-slate-300 sm:w-auto">
                  Ver planos
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 shadow-xl shadow-slate-300/40">
            <div className="rounded-xl bg-slate-800 p-4">
              <p className="text-xs text-slate-400">Painel Financeiro</p>
              <p className="text-lg font-semibold text-white">Visao consolidada</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-700 p-3">
                  <p className="text-xs text-slate-300">Saldo Atual</p>
                  <p className="text-xl font-semibold text-emerald-400">R$ 8.240</p>
                </div>
                <div className="rounded-lg bg-slate-700 p-3">
                  <p className="text-xs text-slate-300">Despesas</p>
                  <p className="text-xl font-semibold text-rose-300">R$ 3.110</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-700 p-3">
                <p className="mb-2 text-xs text-slate-300">Tendencia mensal</p>
                <div className="flex h-20 items-end gap-2">
                  <div className="h-8 w-6 rounded-sm bg-slate-500" />
                  <div className="h-11 w-6 rounded-sm bg-slate-400" />
                  <div className="h-10 w-6 rounded-sm bg-slate-400" />
                  <div className="h-14 w-6 rounded-sm bg-emerald-500" />
                  <div className="h-16 w-6 rounded-sm bg-emerald-400" />
                  <div className="h-12 w-6 rounded-sm bg-slate-400" />
                  <div className="h-18 w-6 rounded-sm bg-emerald-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Recursos</h2>
          <p className="mt-2 text-slate-600">IA, relatorios e simplicidade para evoluir sua rotina financeira.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 shadow-md shadow-slate-200/50">
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Brain className="h-5 w-5" />
                </div>
                <CardTitle>IA na classificacao</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">
                Menos trabalho manual com sugestoes inteligentes por categoria e padrao de gasto.
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-md shadow-slate-200/50">
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <CardTitle>Relatorios claros</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">
                Dashboards e indicadores para comparar periodos e identificar gargalos financeiros.
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-md shadow-slate-200/50">
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle>Simplicidade de uso</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">
                Fluxo rapido para cadastrar e acompanhar transacoes, no desktop ou no celular.
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Como Funciona</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 shadow-md shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg">1. Conecte sua rotina</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">
                Cadastre receitas, despesas e contas de forma guiada.
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-md shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg">2. Analise com clareza</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">
                Visualize seu saldo real, previsto e tendencias com relatorios objetivos.
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-md shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg">3. Decida melhor</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600">
                Use insights para ajustar gastos e acelerar suas metas financeiras.
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="precos" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tabela de Precos</h2>
            <p className="mt-2 text-slate-600">Escolha o plano ideal para seu momento financeiro.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "border-2 border-emerald-500 bg-white shadow-xl shadow-emerald-200/50"
                    : "border border-slate-200 bg-white shadow-lg shadow-slate-200/50"
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    {plan.highlighted && (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Mais escolhido</Badge>
                    )}
                  </CardTitle>
                  <p className="text-3xl font-bold text-slate-900">{plan.price}</p>
                  <p className="text-sm text-slate-600">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-3 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="block">
                    <Button
                      className={
                        plan.highlighted
                          ? "w-full bg-emerald-600 text-white hover:bg-emerald-700"
                          : "w-full bg-slate-900 text-white hover:bg-slate-800"
                      }
                    >
                      Assinar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Depoimentos</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="border-slate-200 shadow-md shadow-slate-200/50">
                <CardContent className="pt-6">
                  <p className="text-sm leading-relaxed text-slate-700">"{item.quote}"</p>
                  <p className="mt-4 text-sm font-semibold text-slate-900">{item.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6">
          <div className="rounded-2xl bg-slate-900 px-6 py-10 text-center text-white">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">Pronto para comecar?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">
              Entre no sistema e transforme suas financas com mais previsibilidade e confianca.
            </p>
            <Link to="/auth" className="mt-6 inline-block">
              <Button size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
                Acessar Sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
