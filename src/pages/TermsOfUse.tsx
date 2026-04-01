import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ScrollText } from "lucide-react";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8 hover:bg-white/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
              <ScrollText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Termos de Uso</h1>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Aceitação</h2>
              <p>Ao acessar o MoneyGuia, você concorda com estes termos.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Serviço</h2>
              <p>A plataforma é uma ferramenta de auxílio à organização financeira. Não garantimos resultados financeiros, pois as decisões são de inteira responsabilidade do usuário.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Idade</h2>
              <p>O MoneyGuia é livre para todas as idades. Menores de 16 anos declaram estar assistidos por seus responsáveis legais.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Propriedade Intelectual</h2>
              <p>Todo o design e código são de propriedade exclusiva do MoneyGuia.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Cancelamento</h2>
              <p>Você pode excluir sua conta a qualquer momento nas configurações.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}