import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPolicy() {
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
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Política de Privacidade (LGPD)</h1>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Coleta de Dados</h2>
              <p>Coletamos e-mail para autenticação e os dados financeiros inseridos voluntariamente para gerar seus relatórios.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Finalidade</h2>
              <p>Seus dados são processados apenas para o funcionamento da ferramenta.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Segurança</h2>
              <p>Utilizamos criptografia de ponta e infraestrutura do Supabase para garantir a integridade das informações.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Seus Direitos</h2>
              <p>Em conformidade com a LGPD (Lei 13.709/18), você tem direito ao acesso, correção e exclusão definitiva de seus dados.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Cookies</h2>
              <p>Utilizamos cookies apenas para manter sua sessão ativa.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}