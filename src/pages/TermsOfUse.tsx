import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 md:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          className="rounded-2xl border-white/50 bg-white/70 backdrop-blur"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="rounded-3xl border border-white/40 bg-white/80 p-6 shadow-2xl shadow-violet-500/10 backdrop-blur-lg md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 p-2.5 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Termos de Uso - MoneyGuia</h1>
          </div>

          <div className="space-y-4 text-sm leading-7 text-slate-700 md:text-base">
            <p><strong>1. Aceitação:</strong> Ao acessar o MoneyGuia, você concorda com estes termos.</p>
            <p><strong>2. Serviço:</strong> A plataforma é uma ferramenta de auxílio à organização financeira. Não garantimos resultados financeiros, pois as decisões são de inteira responsabilidade do usuário.</p>
            <p><strong>3. Idade:</strong> O MoneyGuia é livre para todas as idades. Menores de 16 anos declaram estar assistidos por seus responsáveis legais.</p>
            <p><strong>4. Propriedade Intelectual:</strong> Todo o design e código são de propriedade exclusiva do MoneyGuia.</p>
            <p><strong>5. Cancelamento:</strong> Você pode excluir sua conta a qualquer momento nas configurações.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
