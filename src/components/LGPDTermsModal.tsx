import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LGPDTermsModal() {
  const { user, isLoading: authLoading } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTermsAccepted = async () => {
      console.log('[LGPD] Checking terms...');
      
      if (authLoading) {
        console.log('[LGPD] Auth is loading, waiting...');
        return;
      }

      if (!user) {
        console.log('[LGPD] No user, hiding modal');
        setLoading(false);
        return;
      }

      try {
        console.log('[LGPD] Fetching profile for user:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('[LGPD] Profile response:', { data, error });

        if (error || !data) {
          console.log('[LGPD] Error or no data, showing modal');
          setShowModal(true);
          setLoading(false);
          return;
        }

        const profileData = data as Record<string, unknown>;
        console.log('[LGPD] Profile data:', profileData);
        console.log('[LGPD] accepted_terms value:', profileData?.accepted_terms);
        
        // Se o campo não existir, é undefined, então mostra o modal
        // Se o campo for false ou null, mostra o modal
        // Se o campo for true, NÃO mostra o modal
        const termsAccepted = profileData?.accepted_terms === true;
        
        console.log('[LGPD] Terms accepted:', termsAccepted);
        
        if (!termsAccepted) {
          console.log('[LGPD] Showing modal - terms NOT accepted');
          setShowModal(true);
        } else {
          console.log('[LGPD] Hiding modal - terms already accepted');
        }
      } catch (err) {
        console.error('[LGPD] Exception:', err);
        console.log('[LGPD] Showing modal as fallback');
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkTermsAccepted();
    }
  }, [user, authLoading]);

  const handleAcceptTerms = async () => {
    if (!user || !acceptedTerms) return;

    setIsSubmitting(true);

    try {
      console.log('[LGPD] Saving terms acceptance...');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          accepted_terms: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0'
        } as Record<string, unknown>)
        .eq('id', user.id);

      if (error) {
        console.error('[LGPD] Error saving terms:', error);
        setIsSubmitting(false);
        return;
      }

      console.log('[LGPD] Terms saved successfully!');
      window.location.reload();
    } catch (err) {
      console.error('[LGPD] Exception:', err);
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando configuração...</p>
        </div>
      </div>
    );
  }

  // Don't show if user is not authenticated
  if (!user) {
    return null;
  }

  // Only show modal if needed
  if (!showModal) {
    return null;
  }

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
              acceptedTerms 
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
