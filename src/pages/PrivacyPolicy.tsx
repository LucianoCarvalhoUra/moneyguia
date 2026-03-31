import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Política de Privacidade (LGPD) - MoneyGuia</h1>
          </div>

          <div className="space-y-4 text-sm leading-7 text-slate-700 md:text-base">
            <p><strong>1. Coleta de Dados:</strong> Coletamos e-mail para autenticação e os dados financeiros inseridos voluntariamente para gerar seus relatórios.</p>
            <p><strong>2. Finalidade:</strong> Seus dados são processados apenas para o funcionamento da ferramenta.</p>
            <p><strong>3. Segurança:</strong> Utilizamos criptografia de ponta e infraestrutura do Supabase para garantir a integridade das informações.</p>
            <p><strong>4. Seus Direitos:</strong> Em conformidade com a LGPD (Lei 13.709/18), você tem direito ao acesso, correção e exclusão definitiva de seus dados.</p>
            <p><strong>5. Cookies:</strong> Utilizamos cookies apenas para manter sua sessão ativa.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
