import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Wallet, Shield, Check, Loader2, X } from 'lucide-react';
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

      const { error: upsertError } = await (supabase.from('profiles') as any)
        .update({
          accepted_terms: true,
          terms_accepted_at: acceptedAt,
          terms_version: '1.0',
          lgpd_accepted_at: acceptedAt,
        })
        .eq('user_id', userId);

      if (upsertError) {
        setError(`Erro ao salvar: ${upsertError.message}`);
        setIsSubmitting(false);
        return;
      }

      onAccept();
    } catch (err) {
      console.error('[LGPD] Exception:', err);
      setError('Erro inesperado ao salvar');
      setIsSubmitting(false);
    }
  };

  const handleDeclineNow = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <AlertDialog open>
      <AlertDialogContent className="z-[9999] p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-xl w-[95vw] max-w-lg max-h-[90dvh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-300">
        <AlertDialogHeader>
          <AlertDialogTitle className="sr-only">Termos LGPD</AlertDialogTitle>
        </AlertDialogHeader>

        <AlertDialogDescription asChild>
          <div className="text-slate-900 flex flex-col overflow-hidden">
            {/* Header com gradiente */}
            <div className="relative bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 px-6 py-6 sm:px-8 sm:py-8 text-center shrink-0">
              <button
                type="button"
                className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                onClick={() => onAccept()}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20">
                  <Shield className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1">
                Atualização de Privacidade
              </h2>
              <p className="text-white/80 text-xs sm:text-sm">
                Precisamos da sua confirmação sobre os novos termos
              </p>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-slate-900">MoneyGuia</span>
              </div>

              <div className="text-center">
                <p className="text-xs sm:text-sm text-slate-600">
                  Aceite os{' '}
                  <Link to="/terms" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/privacy" target="_blank" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                    Política de Privacidade (LGPD)
                  </Link>{' '}
                  para continuar.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 sm:p-4 space-y-2.5">
                {[
                  'Seus dados pessoais são protegidos e seguros',
                  'Não compartilhamos dados com terceiros sem consentimento',
                  'Você pode solicitar a exclusão dos seus dados a qualquer momento',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-700">{text}</p>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 cursor-pointer group p-3 sm:p-4 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors">
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-5 w-5 rounded border-2 border-slate-300 bg-white cursor-pointer accent-emerald-600"
                  />
                </div>
                <span className="text-xs sm:text-sm text-slate-600 group-hover:text-slate-700">
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
            </div>
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter className="px-5 pb-5 pt-0 sm:px-8 sm:pb-6 shrink-0">
          <Button
            onClick={handleAcceptTerms}
            disabled={!acceptedTerms || isSubmitting}
            className={cn(
              'h-11 sm:h-12 rounded-2xl text-sm sm:text-base font-semibold transition-all w-full',
              acceptedTerms && !isSubmitting
                ? 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-lg hover:brightness-110'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed',
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
