import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionPlan = 'free' | 'premium' | 'total';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled';
export type FeatureKey = 'ai_classification' | 'advanced_reports' | 'extra_control';

function getAuthErrorMessage(error: { message: string }): string {
  console.error('Auth error:', error);

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos';
  }
  if (message.includes('email not confirmed')) {
    return 'E-mail ainda nao foi confirmado. Verifique sua caixa de entrada.';
  }
  if (message.includes('user already registered')) {
    return 'Este e-mail ja esta cadastrado';
  }
  if (message.includes('password')) {
    return 'A senha deve ter pelo menos 6 caracteres';
  }
  if (message.includes('email')) {
    return 'E-mail invalido';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }

  return 'Erro ao processar sua solicitacao. Tente novamente.';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: string | null;
  isSubscriptionValid: boolean;
  hasFeatureAccess: (feature: FeatureKey) => boolean;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const navigate = useNavigate();

  const getDefaultProfileState = useCallback(() => ({
    subscription_plan: 'free' as SubscriptionPlan,
    subscription_status: 'active' as SubscriptionStatus,
    subscription_end_date: null as string | null,
  }), []);

  const hasFeatureAccess = useCallback(
    (feature: FeatureKey) => {
      if (feature === 'ai_classification') {
        return subscriptionPlan === 'premium' || subscriptionPlan === 'total';
      }
      if (feature === 'advanced_reports' || feature === 'extra_control') {
        return subscriptionPlan === 'total';
      }
      return false;
    },
    [subscriptionPlan],
  );

  const loadProfile = useCallback(async (userId: string) => {
    setIsProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, subscription_end_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const defaults = getDefaultProfileState();
      const plan = ((data as any)?.subscription_plan || defaults.subscription_plan) as SubscriptionPlan;
      const status = ((data as any)?.subscription_status || defaults.subscription_status) as SubscriptionStatus;
      const expiry =
        (data as any)?.subscription_end_date ||
        defaults.subscription_end_date;

      setSubscriptionPlan(plan);
      setSubscriptionStatus(status);
      setSubscriptionEndDate(expiry);
    } catch (error) {
      console.error('Erro ao carregar perfil, aplicando perfil padrao:', error);
      const defaults = getDefaultProfileState();
      setSubscriptionPlan(defaults.subscription_plan);
      setSubscriptionStatus(defaults.subscription_status);
      setSubscriptionEndDate(defaults.subscription_end_date);
    } finally {
      setIsProfileLoading(false);
    }
  }, [getDefaultProfileState]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadProfile(user.id);
  }, [user?.id, loadProfile]);

  const createProfileIfNotExists = useCallback(async (authUser: User) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        user_id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
        email: authUser.email,
        subscription_plan: 'free',
        subscription_status: 'active',
      } as any);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, authSession) => {
      setSession(authSession);
      setUser(authSession?.user ?? null);
      setIsLoading(false);

      if (event === 'SIGNED_IN' && authSession?.user) {
        setTimeout(() => {
          createProfileIfNotExists(authSession.user).then(() => loadProfile(authSession.user.id));
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        setSubscriptionPlan('free');
        setSubscriptionStatus('active');
        setSubscriptionEndDate(null);
        setIsProfileLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        loadProfile(existingSession.user.id);
      } else {
        setIsProfileLoading(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [createProfileIfNotExists, loadProfile]);

  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const handleLogoutOnInactivity = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        navigate('/auth', { replace: true });
      }
    };

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(handleLogoutOnInactivity, 15 * 60 * 1000);
    };

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'scroll', 'click'];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    return { success: true };
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name },
      },
    });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSubscriptionPlan('free');
    setSubscriptionStatus('active');
    setSubscriptionEndDate(null);
    navigate('/auth', { replace: true });
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        isLoading,
        isProfileLoading,
        subscriptionPlan,
        subscriptionStatus,
        subscriptionEndDate,
        isSubscriptionValid: subscriptionStatus === 'active' || subscriptionStatus === 'trial',
        hasFeatureAccess,
        refreshProfile,
        login,
        register,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
