import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Shield, Check } from 'lucide-react';
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

      console.log('[LGPD] Saving for user_id:', userId);

      // Estratégia: UPDATE primeiro, depois INSERT
      const updateData = {
        accepted_terms: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      };

      // 1. Tentar UPDATE por user_id
      console.log('[LGPD] Trying UPDATE...');
      const updateResult = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('user_id', userId);

      const { error: updateError, count } = updateResult;

      console.log('[LGPD] UPDATE result:', { error: updateError, count });

      if (updateError) {
        console.error('[LGPD] UPDATE failed:', updateError);
        
        // 2. Se UPDATE falhar, tentar INSERT
        console.log('[LGPD] Trying INSERT...');
        const insertResult = await (supabase
          .from('profiles') as any)
          .insert({
            id: userId,
            user_id: userId,
            accepted_terms: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
            email: user.email || '',
            name: user.user_metadata?.name || '',
          });

        const { error: insertError, data: insertData } = insertResult;
        console.log('[LGPD] INSERT result:', { error: insertError, data: insertData });

        if (insertError) {
          console.error('[LGPD] INSERT failed:', insertError);
          setError(`Erro ao salvar: ${insertError.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      console.log('[LGPD] Gravação bem sucedida para:', userId);
      
      // Fechar modal apenas após sucesso
      onAccept();
      
    } catch (err) {
      console.error('[LGPD] Exception:', err);
      setError('Erro inesperado ao salvar');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
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
              "w-full h-12 text-base font-semibold rounded-full transition-all",
              acceptedTerms && !isSubmitting
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200/50" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {isSubmitting ? "Salvando..." : "Continuar"}
          </Button>

          <p className="text-center text-xs text-slate-400 mt-4">
            Ao continuar, você concorda com nossos termos atualizados
          </p>
        </div>
      </div>
    </div>
  );
}
