import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Shield, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LGPDTermsModalProps {
  onAccept: () => void;
}

export default function LGPDTermsModal({ onAccept }: LGPDTermsModalProps) {
  const { user } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptTerms = async () => {
    if (!user || !acceptedTerms) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let userId = user.id;
      
      if (!userId) {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id;
      }

      if (!userId) {
        console.error('[LGPD] FATAL: No user ID!');
        setError('Erro: usuário não identificado');
        setIsSubmitting(false);
        return;
      }

      const acceptedAt = new Date().toISOString();

      const { error: upsertError } = await (supabase.from('profiles') as any).upsert(
        {
          id: userId,
          user_id: userId,
          email: user.email || '',
          name: user.user_metadata?.name || '',
          accepted_terms: true,
          terms_accepted_at: acceptedAt,
          terms_version: '1.0',
          lgpd_accepted_at: acceptedAt,
        },
        { onConflict: 'user_id' },
      );

      if (upsertError) {
        setError(`Erro ao salvar: ${upsertError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      // Fechar modal apenas após sucesso
      onAccept();
      
    } catch (err) {
      console.error('[LGPD] Exception:', err);
      setError('Erro inesperado ao salvar');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-[90vw] max-w-lg overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-2xl shadow-violet-500/20 backdrop-blur-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <ShieldCheck className="pointer-events-none absolute -bottom-8 -right-6 h-40 w-40 text-violet-400/15" />
        <div className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Atualização de Privacidade
          </h2>
          <p className="text-emerald-100 text-sm">
            Precisamos da sua confirmação sobre os novos termos
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">MoneyGuia</span>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Termos de Uso e Política de Privacidade
            </h3>
            <p className="text-sm text-slate-600">
              Atualizamos nossos Termos de Uso e Política de Privacidade em conformidade com a LGPD.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">Seus dados pessoais são protegidos e seguros</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">Não compartilhamos dados com terceiros sem consentimento</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">Você pode solicitar a exclusão dos seus dados a qualquer momento</p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group mb-6 p-4 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors">
            <div className="relative flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-5 w-5 rounded border-2 border-slate-300 bg-white cursor-pointer accent-emerald-600"
              />
            </div>
            <span className="text-sm text-slate-600 group-hover:text-slate-700">
              Li e aceito os{' '}
              <Link to="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium underline" onClick={(e) => e.stopPropagation()} target="_blank">
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link to="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium underline" onClick={(e) => e.stopPropagation()} target="_blank">
                Política de Privacidade (LGPD)
              </Link>
            </span>
          </label>

          <Button
            onClick={handleAcceptTerms}
            disabled={!acceptedTerms || isSubmitting}
            className={cn(
              "w-full h-12 rounded-2xl text-base font-semibold transition-all",
              acceptedTerms && !isSubmitting
                ? "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-lg hover:brightness-110" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Li e Aceito'
            )}
          </Button>

          <p className="text-center text-xs text-slate-400 mt-4">
            Ao continuar, você concorda com nossos termos atualizados
          </p>
        </div>
      </div>
    </div>
  );
}
