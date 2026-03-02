import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CreditCard,
  LayoutDashboard,
  Lock,
  Monitor,
  PieChart,
  Shield,
  Smartphone,
  Tag,
  Target,
  TrendingUp,
  Wallet,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard inteligente",
    description: "Visualize saldos, tendências e resumos financeiros em tempo real.",
  },
  {
    icon: CreditCard,
    title: "Controle de contas e cartões",
    description: "Gerencie todas as suas contas bancárias e cartões de crédito em um só lugar.",
  },
  {
    icon: Tag,
    title: "Categorias personalizadas",
    description: "Crie suas próprias categorias de acordo com a sua necessidade.",
  },
  {
    icon: Bell,
    title: "Alertas de vencimento",
    description: "Receba notificações por e-mail e nunca mais pague juros por atraso.",
  },
  {
    icon: PieChart,
    title: "Relatórios completos",
    description: "Gráficos claros e resumos para entender para onde vai cada centavo.",
  },
  {
    icon: Target,
    title: "Metas financeiras",
    description: "Defina objetivos e acompanhe seu progresso rumo à independência financeira.",
  },
  {
    icon: TrendingUp,
    title: "Receitas e despesas",
    description: "Cadastre ganhos e gastos com suporte a recorrências e parcelamentos.",
  },
  {
    icon: Monitor,
    title: "Multiplataforma",
    description: "Acesse de qualquer dispositivo — celular, tablet ou computador.",
  },
];

const steps = [
  {
    number: "01",
    title: "Cadastre suas contas e cartões",
    description: "Comece organizando suas contas bancárias e cartões para ter uma visão completa das suas finanças.",
  },
  {
    number: "02",
    title: "Registre receitas e despesas",
    description: "Cadastre seus ganhos e gastos em tempo real, de onde estiver, com categorias personalizadas.",
  },
  {
    number: "03",
    title: "Acompanhe seus relatórios",
    description: "Visualize gráficos e resumos para entender exatamente para onde seu dinheiro está indo.",
  },
  {
    number: "04",
    title: "Alcance suas metas",
    description: "Defina objetivos financeiros, acompanhe o progresso e transforme o controle em hábito.",
  },
];

const faqs = [
  {
    question: "Posso usar no celular e no computador?",
    answer: "Sim! O KeepMoney é totalmente responsivo e funciona perfeitamente em celulares, tablets e computadores através do navegador.",
  },
  {
    question: "Meus dados financeiros estão seguros?",
    answer: "Sim. Utilizamos criptografia e políticas de segurança avançadas para proteger todos os seus dados. Sua privacidade é nossa prioridade.",
  },
  {
    question: "Posso cadastrar despesas recorrentes e parceladas?",
    answer: "Sim! O sistema suporta despesas recorrentes mensais e parcelamentos no cartão de crédito, facilitando o planejamento financeiro.",
  },
  {
    question: "Recebo alertas de contas a vencer?",
    answer: "Sim. Você pode configurar notificações por e-mail para ser lembrado antes do vencimento das suas contas e nunca mais pagar juros.",
  },
  {
    question: "Posso personalizar as categorias?",
    answer: "Com certeza! Você pode criar suas próprias categorias e subcategorias de despesas e receitas de acordo com suas necessidades.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            <a href="#recursos" className="transition-colors hover:text-gray-900">Recursos</a>
            <a href="#como-funciona" className="transition-colors hover:text-gray-900">Como funciona</a>
            <Link to="/plans" className="transition-colors hover:text-gray-900">Planos</Link>
            <a href="#faq" className="transition-colors hover:text-gray-900">FAQ</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/auth">
              <Button variant="ghost" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Login
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700">
                Comece já
              </Button>
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-gray-600">Recursos</a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-gray-600">Como funciona</a>
              <Link to="/plans" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-gray-600">Planos</Link>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-gray-600">FAQ</a>
              <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-4">
                <Link to="/auth" className="text-center text-sm font-medium text-gray-700">Login</Link>
                <Link to="/auth">
                    <Button className="w-full rounded-full bg-indigo-600 text-white hover:bg-indigo-700">Comece já</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
              <div className="space-y-8">
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                  Seu dinheiro sob controle,{" "}
                  <span className="text-indigo-600">sem esforço</span>
                </h1>
                <p className="max-w-lg text-lg leading-relaxed text-gray-600">
                  Tudo o que você precisa para organizar suas finanças pessoais sem perder tempo. Controle despesas, receitas e metas em um só lugar.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link to="/auth">
                    <Button className="flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-6 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl">
                      Começar agora
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-8 pt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Lock className="h-4 w-4 text-indigo-600" />
                    <span>Segurança dos seus dados em primeiro lugar</span>
                  </div>
                  <div className="hidden items-center gap-2 text-sm text-gray-500 sm:flex">
                    <Smartphone className="h-4 w-4 text-indigo-600" />
                    <span>Acesse de qualquer dispositivo</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-2xl shadow-indigo-100/70">
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-6 text-white">
                    <p className="text-sm font-medium text-indigo-100">Visão financeira do mês</p>
                    <p className="mt-2 text-3xl font-extrabold">R$ 8.420,00</p>
                    <p className="mt-1 text-sm text-indigo-100">Saldo projetado: +12,4%</p>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[72, 46, 84].map((value, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-4">
                        <div className="mb-2 h-2 w-full rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${value}%` }} />
                        </div>
                        <p className="text-xs text-slate-500">Meta {i + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Organize suas finanças</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                  O guia para o seu sucesso financeiro
                </h2>
              </div>
              <div />
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number} className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50">
                  <span className="text-3xl font-extrabold text-indigo-500/30">{step.number}</span>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="bg-gray-50 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Funcionalidades</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Nossos principais recursos</h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600">
                Conheça os recursos que vão revolucionar seu controle financeiro.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security / Benefits CTA */}
        <section className="bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Segurança em primeiro lugar</p>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                  Tenha a gestão financeira que sempre sonhou
                </h2>
                <ul className="space-y-4">
                  {[
                    "Interface limpa e sem distrações para focar no que importa",
                    "Registre e acompanhe seus gastos a qualquer momento",
                    "Gerencie cartões de crédito e contas em um único lugar",
                    "Receba alertas de contas a pagar e evite juros",
                    "Defina metas e acompanhe seu progresso financeiro",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button className="mt-4 rounded-full bg-indigo-600 px-8 py-6 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                    Começar agora
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-600 p-8 text-white shadow-2xl shadow-indigo-200">
                  <Shield className="mx-auto mb-6 h-16 w-16 opacity-90" />
                  <h3 className="text-center text-2xl font-bold">Seus dados protegidos</h3>
                  <p className="mt-3 text-center text-indigo-100">
                    Criptografia e políticas de segurança avançadas para garantir a privacidade dos seus dados financeiros.
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm">
                      <p className="text-2xl font-bold">100%</p>
                      <p className="text-xs text-indigo-100">Dados criptografados</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm">
                      <p className="text-2xl font-bold">24/7</p>
                      <p className="text-xs text-indigo-100">Acesso disponível</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Perguntas frequentes</h2>
            </div>

            <div className="mt-12 space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white">
                  <button
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-base font-semibold text-gray-900">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-gray-100 px-6 pb-5 pt-3">
                      <p className="text-sm leading-relaxed text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-indigo-600 to-cyan-600 py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Pronto para assumir o controle do seu dinheiro?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-100">
              Comece agora e transforme suas finanças com mais organização e confiança.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth">
                <Button className="rounded-full bg-white px-8 py-6 text-base font-semibold text-indigo-700 shadow-lg hover:bg-gray-50">
                  Acessar o sistema
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
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
            <p className="text-sm text-gray-500">© 2026 KeepMoney. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
