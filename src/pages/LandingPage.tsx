import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, TrendingUp, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LandingPageSEO } from "@/components/SEO";

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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Array<{ id: string; rating: number; comment: string | null }>>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  // Não redirecionar automaticamente — usuário pode visitar a home livremente

  // Scroll to section if hash exists in URL
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, []);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from("csat_responses")
          .select("id, rating, comment")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;
        setTestimonials((data as Array<{ id: string; rating: number; comment: string | null }>) || []);
      } catch {
        setTestimonials([]);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    loadTestimonials();
  }, []);
  
  // Se estiver carregando ou usuário logado, não renderiza o conteúdo principal
  if (isLoading || user) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <PublicHeader />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-slate-500">Carregando...</div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      <LandingPageSEO />
      <PublicHeader />

      <main>
        <section className="py-10 sm:py-16 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 sm:gap-12 lg:grid-cols-2 lg:px-8">
            <div className="space-y-5 sm:space-y-7">
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 sm:text-xs">
                <Sparkles className="h-4 w-4" />
                IA Financeira
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#1e293b] sm:text-4xl md:text-5xl lg:text-6xl">
                Domine suas Finanças com Inteligência Artificial
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[#64748b] sm:text-lg">
                O controle orçamentário que aprende com seus hábitos e automatiza sua gestão financeira.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link to="/planos" className="w-full sm:w-auto">
                  <Button 
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 px-6 py-4 text-base sm:text-lg font-bold text-white rounded-full shadow-lg shadow-emerald-200 hover:shadow-xl sm:hover:scale-105 transition-all duration-200"
                  >
                    Vamos Começar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-xs sm:text-sm text-muted-foreground sm:pl-2">
                  Sem cartão de crédito. Grátis para sempre.
                </p>
              </div>
            </div>

            <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" role="img" aria-label="Dashboard do MoneyGuia mostrando gráfico de gastos e métricas financeiras">
              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-[#64748b]">Crescimento projetado</p>
                  <p className="mt-1 text-3xl font-bold text-[#059669]">+18,2%</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <ShieldCheck className="h-5 w-5 text-amber-500" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-[#1e293b]">Segurança ativa</p>
                    <p className="text-xs text-[#64748b]">Proteção multicamada para seus dados.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <TrendingUp className="h-5 w-5 text-[#059669]" aria-hidden="true" />
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

        <section id="recursos" className="py-10 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#059669] sm:text-sm">Recursos</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1e293b] sm:text-3xl md:text-4xl">Clareza visual e decisões melhores</h2>
            </div>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

        <section id="seguranca" className="pb-14 sm:pb-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
              <ShieldCheck className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#1e293b] sm:text-3xl md:text-4xl">
                Segurança e crescimento no mesmo painel
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-[#64748b] sm:text-lg">
                Um sistema moderno, com excelente legibilidade, pronto para apoiar sua estratégia financeira.
              </p>
            </div>
          </div>
        </section>

        <section id="depoimentos" className="pb-14 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#059669] sm:text-sm">Depoimentos</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1e293b] sm:text-3xl md:text-4xl">
                O que nossos usuários dizem
              </h2>
            </div>

            {loadingTestimonials ? (
              <p className="mt-8 text-center text-sm text-[#64748b]">Carregando depoimentos...</p>
            ) : testimonials.length === 0 ? (
              <p className="mt-8 text-center text-sm text-[#64748b]">Ainda não há depoimentos públicos.</p>
            ) : (
              <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial) => (
                  <article key={testimonial.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-3 flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${index < testimonial.rating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-[#334155]">
                      {testimonial.comment || "Usuário avaliou positivamente sua experiência no MoneyGuia."}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
