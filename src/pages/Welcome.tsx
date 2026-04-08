import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WelcomeSEO } from "@/components/SEO";

const features = [
  {
    title: "Gestao de Receitas e Despesas",
    description: "Registre tudo em segundos e acompanhe cada movimentacao em um so lugar.",
    icon: Wallet,
  },
  {
    title: "Relatorios Inteligentes",
    description: "Visualize tendencias, categorias e pontos de melhoria com clareza.",
    icon: BarChart3,
  },
  {
    title: "Classificacao com IA",
    description: "Automatize a organizacao financeira e ganhe tempo para o que importa.",
    icon: Sparkles,
  },
  {
    title: "Seguranca de Dados",
    description: "Sua informacao protegida com boas praticas de autenticacao e acesso.",
    icon: ShieldCheck,
  },
];

const plans = [
  {
    name: "Basico",
    price: "Gratis",
    subtitle: "Para comecar sem custo",
    cta: "Comecar gratis",
    highlight: false,
    items: [
      "Funcoes essenciais",
      "Controle de receitas e despesas",
      "Limite de lancamentos mensais",
      "Sem classificacao com IA",
    ],
  },
  {
    name: "Pro",
    price: "R$ 29/m",
    subtitle: "Para acelerar sua organizacao",
    cta: "Assinar Pro",
    highlight: true,
    items: [
      "Tudo do plano Basico",
      "Classificacao com IA",
      "Graficos avancados",
      "Suporte prioritario",
    ],
  },
  {
    name: "Premium Familia",
    price: "R$ 59/m",
    subtitle: "Para compartilhar e escalar controle",
    cta: "Assinar Premium",
    highlight: false,
    items: [
      "Tudo do plano Pro",
      "Exportacao de relatorios",
      "Multiplos usuarios",
      "Acompanhamento colaborativo",
    ],
  },
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <WelcomeSEO />
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <CircleDollarSign className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">MoneyGuia</span>
          </div>
          <Link to="/auth">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">Entrar</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-7">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900">
              Plataforma de controle financeiro
            </Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Assuma o controle total da sua vida financeira
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Organize receitas e despesas, receba insights claros e evolua sua saude financeira com
              tecnologia de IA e uma experiencia simples de usar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
                  Comecar Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#planos">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-slate-300 bg-white text-slate-800 hover:bg-slate-100 sm:w-auto"
                >
                  Ver planos
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40">
            <div className="rounded-xl border border-slate-100 bg-slate-900 p-4 text-white">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-300">Dashboard MoneyGuia</p>
                  <p className="text-lg font-semibold">Resumo do mes</p>
                </div>
                <Badge className="bg-emerald-500 text-emerald-950 hover:bg-emerald-500">+12,4%</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-400">Saldo Real</p>
                  <p className="text-xl font-semibold text-emerald-400">R$ 6.450</p>
                </div>
                <div className="rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-400">Despesas Totais</p>
                  <p className="text-xl font-semibold text-rose-400">R$ 2.980</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-slate-800 p-3">
                <p className="mb-3 text-xs text-slate-400">Fluxo semanal</p>
                <div className="flex h-20 items-end gap-2">
                  <div className="h-8 w-6 rounded-sm bg-slate-600" />
                  <div className="h-10 w-6 rounded-sm bg-slate-500" />
                  <div className="h-14 w-6 rounded-sm bg-emerald-500" />
                  <div className="h-12 w-6 rounded-sm bg-slate-500" />
                  <div className="h-16 w-6 rounded-sm bg-emerald-400" />
                  <div className="h-11 w-6 rounded-sm bg-slate-500" />
                  <div className="h-18 w-6 rounded-sm bg-emerald-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Vantagens da plataforma</h2>
            <p className="mt-2 text-slate-600">Recursos pensados para transformar seu controle financeiro em resultados.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-relaxed text-slate-600">{feature.description}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Planos para cada momento</h2>
            <p className="mt-2 text-slate-600">Escolha o plano ideal e evolua no seu ritmo.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlight
                    ? "relative border-2 border-emerald-500 bg-white shadow-xl shadow-emerald-200/60"
                    : "border border-slate-200 bg-white shadow-sm"
                }
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-6 bg-emerald-600 text-white hover:bg-emerald-600">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-slate-500">{plan.subtitle}</p>
                  <p className="pt-2 text-3xl font-bold text-slate-900">{plan.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-3 text-sm text-slate-600">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="block">
                    <Button
                      className={
                        plan.highlight
                          ? "w-full bg-emerald-600 text-white hover:bg-emerald-700"
                          : "w-full bg-slate-900 text-white hover:bg-slate-800"
                      }
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
          <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-slate-900">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="rounded-xl border border-slate-200 bg-white px-5">
            <AccordionItem value="item-1">
              <AccordionTrigger>Posso usar o plano Basico por quanto tempo?</AccordionTrigger>
              <AccordionContent>
                O plano Basico pode ser usado por tempo indeterminado, com limite de lancamentos e sem recursos de IA.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Como funciona a classificacao com IA?</AccordionTrigger>
              <AccordionContent>
                A IA sugere classificacoes para suas transacoes com base em descricao e categoria, reduzindo trabalho manual.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Os dados ficam seguros?</AccordionTrigger>
              <AccordionContent>
                Sim. A plataforma aplica autenticacao, isolamento por usuario e boas praticas de protecao dos dados.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Posso mudar de plano depois?</AccordionTrigger>
              <AccordionContent>
                Sim. Voce pode fazer upgrade ou downgrade a qualquer momento de acordo com sua necessidade.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
          <div className="rounded-2xl bg-slate-900 px-6 py-10 text-center text-white md:px-10">
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">Pronto para organizar sua vida financeira?</h3>
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">
              Comece agora e transforme dados em decisoes com mais clareza, previsao e controle.
            </p>
            <Link to="/auth" className="mt-6 inline-block">
              <Button size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
                Comecar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
