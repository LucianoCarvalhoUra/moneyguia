import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Shield, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileWithLGPD {
  id: string;
  accepted_terms?: boolean;
  terms_accepted_at?: string;
  terms_version?: string;
  [key: string]: unknown;
}

export default function LGPDTermsModal() {
  const { user, isLoading: authLoading } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userReady, setUserReady] = useState(false);

  const checkTermsAccepted = useCallback(async () => {
    console.log('[LGPD] Checking terms...');
    
    if (authLoading) {
      console.log('[LGPD] Auth is loading, waiting...');
      return;
    }

    let userId = user?.id;
    
    if (!userId) {
      console.log('[LGPD] user.id is null, trying getUser()...');
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id;
      console.log('[LGPD] getUser() result:', data?.user?.id);
    }

    if (!userId) {
      console.log('[LGPD] No user ID available, hiding modal');
      setLoading(false);
      setUserReady(false);
      return;
    }

    setUserReady(true);
    console.log('[LGPD] User ID:', userId);

    try {
      console.log('[LGPD] Fetching profile...');
      
      const result = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data, error, status } = result;

      console.log('[LGPD] Response status:', status);
      console.log('[LGPD] Response data:', data);
      console.log('[LGPD] Response error:', error);

      if (error || status === 406) {
        console.log('[LGPD] Error fetching profile');
        setShowModal(true);
        setLoading(false);
        return;
      }

      if (!data) {
        console.log('[LGPD] No profile data, showing modal');
        setShowModal(true);
        setLoading(false);
        return;
      }

      const profileData = data as ProfileWithLGPD;
      const hasAccepted = profileData.accepted_terms === true;
      
      console.log('[LGPD] accepted_terms value:', profileData.accepted_terms);
      console.log('[LGPD] Terms accepted:', hasAccepted);
      
      setTermsAccepted(hasAccepted);
      
      if (!hasAccepted) {
        console.log('[LGPD] Terms NOT accepted, showing modal');
        setShowModal(true);
      } else {
        console.log('[LGPD] Terms already accepted, hiding modal');
        setShowModal(false);
      }
    } catch (err) {
      console.error('[LGPD] Exception:', err);
      console.log('[LGPD] Showing modal as fallback');
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) {
      checkTermsAccepted();
    } else if (!authLoading && !user) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          checkTermsAccepted();
        } else {
          setLoading(false);
        }
      });
    }
  }, [authLoading, user, checkTermsAccepted]);

  const handleAcceptTerms = async () => {
    setIsSubmitting(true);

    try {
      let userId = user?.id;
      
      if (!userId) {
        console.log('[LGPD] user.id is null, trying getUser()...');
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id;
        console.log('[LGPD] getUser() result:', data?.user?.id);
      }

      if (!userId) {
        console.error('[LGPD] FATAL: No user ID available!');
        setIsSubmitting(false);
        return;
      }

      console.log('[LGPD] Tentando gravar para user_id:', userId);

      const updateData = {
        accepted_terms: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      };

      // 1. Tentar UPDATE
      console.log('[LGPD] Tentando UPDATE...');
      const updateResult = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('id', userId)
        .select();

      const { data: updateDataResult, error: updateError } = updateResult;

      console.log('[LGPD] UPDATE result - data:', updateDataResult, 'error:', updateError);

      if (updateError) {
        console.error('[LGPD] UPDATE error:', updateError);
        
        // 2. Se UPDATE falhar, tentar INSERT
        console.log('[LGPD] Tentando INSERT...');
        const insertResult = await (supabase
          .from('profiles') as any)
          .insert({
            id: userId,
            user_id: userId,
            accepted_terms: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0',
            email: user?.email || '',
            name: user?.user_metadata?.name || '',
          });

        const { data: insertDataResult, error: insertError } = insertResult;
        console.log('[LGPD] INSERT result - data:', insertDataResult, 'error:', insertError);

        if (insertError) {
          console.error('[LGPD] INSERT error:', insertError);
          setIsSubmitting(false);
          return;
        }
      }

      console.log('[LGPD] Sucesso ao gravar. Terms accepted: true');

      // Fechar modal IMEDIATAMENTE
      setTermsAccepted(true);
      setShowModal(false);
      setIsSubmitting(false);
      
      // Redirecionar com reload para garantir estado fresco
      console.log('[LGPD] Redirecting to dashboard...');
      window.location.href = '/dashboard';
      
    } catch (err) {
      console.error('[LGPD] Exception:', err);
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return null;
  }

  if (!userReady) {
    console.log('[LGPD] User not ready yet, not rendering');
    return null;
  }

  if (termsAccepted) {
    console.log('[LGPD] Terms already accepted');
    return null;
  }

  if (!showModal) {
    console.log('[LGPD] Modal hidden by state');
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
            disabled={!acceptedTerms || isSubmitting || !userReady}
            className={cn(
              "w-full h-12 text-base font-semibold rounded-full transition-all",
              acceptedTerms && userReady && !isSubmitting
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
