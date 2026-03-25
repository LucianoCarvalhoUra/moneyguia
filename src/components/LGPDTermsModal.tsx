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

  console.log('[LGPD] Render - user:', user?.id, 'authLoading:', authLoading, 'loading:', loading);

  useEffect(() => {
    const checkTermsAccepted = async () => {
      console.log('[LGPD] Checking terms - user:', user?.id, 'authLoading:', authLoading);
      
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

        if (error) {
          console.error('[LGPD] Error fetching profile:', error);
          console.log('[LGPD] Showing modal as fallback (error)');
          setShowModal(true);
          setLoading(false);
          return;
        }

        console.log('[LGPD] Profile data:', data);
        
        const profileData = data as Record<string, unknown>;
        const hasAcceptedTerms = profileData?.accepted_terms === true;
        
        console.log('[LGPD] accepted_terms value:', profileData?.accepted_terms, 'hasAcceptedTerms:', hasAcceptedTerms);
        
        if (!hasAcceptedTerms) {
          console.log('[LGPD] Showing modal - terms not accepted');
          setShowModal(true);
        } else {
          console.log('[LGPD] Hiding modal - terms already accepted');
        }
      } catch (err) {
        console.error('[LGPD] Exception:', err);
        console.log('[LGPD] Showing modal as fallback (exception)');
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      checkTermsAccepted();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleAcceptTerms = async () => {
    if (!user || !acceptedTerms) return;

    setIsSubmitting(true);

    try {
      console.log('[LGPD] Saving terms acceptance for user:', user.id);
      
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
        return;
      }

      console.log('[LGPD] Terms accepted successfully!');
      
      window.location.reload();
    } catch (err) {
      console.error('[LGPD] Exception saving terms:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    console.log('[LGPD] Returning null - authLoading:', authLoading, 'loading:', loading);
    return null;
  }

  if (!showModal) {
    console.log('[LGPD] Returning null - showModal:', showModal);
    return null;
  }

  console.log('[LGPD] Rendering modal!');

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
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className={cn(
                  "peer h-5 w-5 shrink-0 rounded border-2 transition-all appearance-none cursor-pointer",
                  "border-slate-300 bg-white hover:border-emerald-400",
                  acceptedTerms && "bg-emerald-600 border-emerald-600"
                )}
              />
              {acceptedTerms && (
                <svg
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
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
