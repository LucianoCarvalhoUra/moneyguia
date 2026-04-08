import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionPlan = 'free' | 'premium' | 'total';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled';
export type FeatureKey = 'ai_classification' | 'advanced_reports' | 'extra_control' | 'visual_edit';
// Role é determinado exclusivamente pela tabela user_roles

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
  isRoleLoading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: string | null;
  isSubscriptionValid: boolean;
  hasFeatureAccess: (feature: FeatureKey) => boolean;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => Promise<void>;
  sendPasswordRecoveryCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyPasswordRecoveryCode: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithRecoveryCode: (
    email: string,
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasLoadedProfile = useRef(false);
  const isFetchingProfileRef = useRef(false);
  const loadedProfileUserIdRef = useRef<string | null>(null);
  const profileLoadedRef = useRef(false);
  const profileCreatedForUserRef = useRef<string | null>(null);
  const loadedRoleUserIdRef = useRef<string | null>(null);
  const isFetchingRoleRef = useRef(false);

  const getDefaultProfileState = useCallback(() => ({
    subscription_plan: 'free' as SubscriptionPlan,
    subscription_status: 'active' as SubscriptionStatus,
    subscription_end_date: null as string | null,
  }), []);
  const getProfileCacheKey = useCallback((userId: string) => `auth_profile_cache:${userId}`, []);

  const hasFeatureAccess = useCallback(
    (feature: FeatureKey) => {
      if (feature === 'ai_classification' || feature === 'visual_edit') {
        return subscriptionPlan === 'total';
      }
      if (feature === 'advanced_reports' || feature === 'extra_control') {
        return subscriptionPlan === 'premium' || subscriptionPlan === 'total';
      }
      return false;
    },
    [subscriptionPlan],
  );

  const resetProfileState = useCallback(() => {
    setSubscriptionPlan('free');
    setSubscriptionStatus('active');
    setSubscriptionEndDate(null);
    setIsProfileLoading(false);
    loadedProfileUserIdRef.current = null;
    profileLoadedRef.current = false;
    hasLoadedProfile.current = false;
    isFetchingProfileRef.current = false;
    setUserRole(null);
    setIsAdmin(false);
    setIsRoleLoading(false);
    loadedRoleUserIdRef.current = null;
    isFetchingRoleRef.current = false;
  }, []);

  const getRoleCacheKey = useCallback((userId: string) => `auth_role_cache:${userId}`, []);

  const loadUserRole = useCallback(async (userId: string, email?: string | null, force = false) => {
    if (!userId) return;
    if (isFetchingRoleRef.current) return;
    if (!force && loadedRoleUserIdRef.current === userId) return;

    // Sempre consultar a tabela user_roles - sem fallback por email
    const cachedRole = localStorage.getItem(getRoleCacheKey(userId));
    if (cachedRole && !force) {
      setUserRole(cachedRole);
      setIsAdmin(cachedRole === 'admin');
      setIsRoleLoading(false);
      loadedRoleUserIdRef.current = userId;
      console.log('[Sistema] Permissões carregadas com sucesso.');
      return;
    }

    isFetchingRoleRef.current = true;
    setIsRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const resolvedRole = data?.role === 'admin' ? 'admin' : 'user';
      setUserRole(resolvedRole);
      setIsAdmin(resolvedRole === 'admin');
      localStorage.setItem(getRoleCacheKey(userId), resolvedRole);
      loadedRoleUserIdRef.current = userId;
      console.log('[Sistema] Permissões carregadas com sucesso.');
    } catch (error: any) {
      if (error?.status === 500 || error?.code === '500') {
        console.error('Erro de permissão no banco');
        const permissionAlertKey = `permission_alert_shown:${userId}`;
        if (!sessionStorage.getItem(permissionAlertKey)) {
          sessionStorage.setItem(permissionAlertKey, 'true');
          window.alert('Erro de permissão no banco');
        }
      }
      setUserRole('user');
      setIsAdmin(false);
      localStorage.setItem(getRoleCacheKey(userId), 'user');
      loadedRoleUserIdRef.current = userId;
    } finally {
      isFetchingRoleRef.current = false;
      setIsRoleLoading(false);
    }
  }, [getRoleCacheKey]);

  const applyDefaultProfile = useCallback(() => {
    const defaults = getDefaultProfileState();
    setSubscriptionPlan(defaults.subscription_plan);
    setSubscriptionStatus(defaults.subscription_status);
    setSubscriptionEndDate(defaults.subscription_end_date);
  }, [getDefaultProfileState]);

  const hydrateProfileFromCache = useCallback((userId: string) => {
    try {
      const raw = localStorage.getItem(getProfileCacheKey(userId));
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (!cached) return;
      setSubscriptionPlan((cached.subscription_plan || 'free') as SubscriptionPlan);
      setSubscriptionStatus((cached.subscription_status || 'active') as SubscriptionStatus);
      setSubscriptionEndDate(cached.subscription_end_date || null);
    } catch {
      // ignore cache issues
    }
  }, [getProfileCacheKey]);

  const loadProfile = useCallback(async (userId: string, force = false) => {
    if (!userId) return;
    if (isFetchingProfileRef.current) return;
    if (!force && profileLoadedRef.current && loadedProfileUserIdRef.current === userId) return;

    isFetchingProfileRef.current = true;
    setIsProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('status, expires_at, billing_cycle, plan_id, subscription_plans(plan_type)')
        .eq('user_id', userId)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const planType = (data as any).subscription_plans?.plan_type || 'free';
        const planMap: Record<string, SubscriptionPlan> = { free: 'free', pro: 'premium', premium: 'total' };
        const normalizedPlan = planMap[planType] || 'free';
        setSubscriptionPlan(normalizedPlan);
        setSubscriptionStatus(data.status as SubscriptionStatus);
        setSubscriptionEndDate(data.expires_at);
        localStorage.setItem(
          getProfileCacheKey(userId),
          JSON.stringify({
            subscription_plan: normalizedPlan,
            subscription_status: data.status,
            subscription_end_date: data.expires_at || null,
          }),
        );
      } else {
        // Fallback: profile row (for environments still syncing schema/logic)
        const profileFallback = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status, subscription_end_date')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profileFallback.error && profileFallback.data) {
          const p = profileFallback.data as any;
          setSubscriptionPlan((p.subscription_plan || 'free') as SubscriptionPlan);
          setSubscriptionStatus((p.subscription_status || 'active') as SubscriptionStatus);
          setSubscriptionEndDate(p.subscription_end_date || null);
          localStorage.setItem(
            getProfileCacheKey(userId),
            JSON.stringify({
              subscription_plan: p.subscription_plan || 'free',
              subscription_status: p.subscription_status || 'active',
              subscription_end_date: p.subscription_end_date || null,
            }),
          );
        } else {
          applyDefaultProfile();
        }
      }
      loadedProfileUserIdRef.current = userId;
      profileLoadedRef.current = true;
      hasLoadedProfile.current = true;
    } catch (error) {
      console.error('Erro ao carregar perfil, aplicando perfil padrao:', error);
      applyDefaultProfile();
      loadedProfileUserIdRef.current = userId;
      profileLoadedRef.current = true;
      hasLoadedProfile.current = true;
    } finally {
      isFetchingProfileRef.current = false;
      setIsProfileLoading(false);
    }
  }, [applyDefaultProfile, getProfileCacheKey]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadProfile(user.id, true);
  }, [user?.id, loadProfile]);

  const createProfileIfNotExists = useCallback(async (authUser: User) => {
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      return;
    }

    const { error: insertError } = await supabase.from('profiles').insert(
      {
        id: authUser.id,
        user_id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
        email: authUser.email,
      } as any,
    );

    if (insertError) {
      throw insertError;
    }
  }, []);

  // Use refs to avoid re-subscribing to auth on every callback change
  const loadProfileRef = useRef(loadProfile);
  loadProfileRef.current = loadProfile;
  const createProfileRef = useRef(createProfileIfNotExists);
  createProfileRef.current = createProfileIfNotExists;

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (!mounted) return;
      const nextUser = authSession?.user ?? null;
      setSession((prev) => (prev?.access_token === authSession?.access_token ? prev : authSession));
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser));
      setIsLoading(false);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && authSession?.user) {
        hydrateProfileFromCache(authSession.user.id);
        if (profileCreatedForUserRef.current !== authSession.user.id) {
          profileCreatedForUserRef.current = authSession.user.id;
          setTimeout(() => {
            createProfileRef.current(authSession.user).catch(() => undefined);
          }, 0);
        }
        if (!hasLoadedProfile.current || loadedProfileUserIdRef.current !== authSession.user.id) {
          setTimeout(() => {
            loadProfileRef.current(authSession.user.id);
          }, 0);
        }
        setTimeout(() => {
          // Forçar recarregamento do role no login para evitar cache stale
          loadUserRole(authSession.user.id, authSession.user.email, event === 'SIGNED_IN');
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        profileCreatedForUserRef.current = null;
        resetProfileState();
      }
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        hydrateProfileFromCache(existingSession.user.id);
        if (!hasLoadedProfile.current || loadedProfileUserIdRef.current !== existingSession.user.id) {
          loadProfileRef.current(existingSession.user.id);
        } else {
          setIsProfileLoading(false);
        }
        loadUserRole(existingSession.user.id, existingSession.user.email);
      } else {
        resetProfileState();
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateProfileFromCache, resetProfileState, loadUserRole]); // stable with guarded refs

  // Listener para atualizações forçadas do plano vindas do Admin
  useEffect(() => {
    const handlePlanChange = () => {
      if (user?.id) {
        loadProfile(user.id, true); // force=true ignora o cache local
      }
    };

    window.addEventListener("user-plan-changed", handlePlanChange);
    return () => window.removeEventListener("user-plan-changed", handlePlanChange);
  }, [user?.id, loadProfile]);

  // Forçar atualização do perfil ao navegar por rotas principais
  // Isso garante que mudanças feitas pelo Admin reflitam imediatamente
  useEffect(() => {
    if (user?.id && ['/dashboard', '/subscription', '/plans'].includes(location.pathname)) {
      loadProfile(user.id, true); // force=true ignora o cache
    }
  }, [location.pathname, user?.id, loadProfile]);

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

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string; userId?: string }> => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
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

    return { success: true, userId: data.user?.id };
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

  const sendPasswordRecoveryCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.functions.invoke('password-reset-otp', {
      body: {
        action: 'request_code',
        email,
      },
    });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    return { success: true };
  };

  const verifyPasswordRecoveryCode = async (
    email: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const normalizedToken = token.replace(/\D/g, '');
    const { data, error } = await supabase.functions.invoke('password-reset-otp', {
      body: {
        action: 'verify_code',
        email,
        code: normalizedToken,
      },
    });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    if (data?.valid) {
      return { success: true };
    }

    return { success: false, error: 'Codigo invalido ou expirado.' };
  };

  const resetPasswordWithRecoveryCode = async (
    email: string,
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const normalizedToken = token.replace(/\D/g, '');
    const { data, error } = await supabase.functions.invoke('password-reset-otp', {
      body: {
        action: 'update_password',
        email,
        code: normalizedToken,
        newPassword,
      },
    });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Nao foi possivel redefinir a senha.' };
    }

    return { success: true };
  };

  const contextValue = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: !!session,
      isLoading,
      isProfileLoading,
      isRoleLoading,
      isAdmin,
      userRole,
      subscriptionPlan,
      subscriptionStatus,
      subscriptionEndDate,
      isSubscriptionValid: subscriptionStatus === 'active' || subscriptionStatus === 'trial',
      hasFeatureAccess,
      refreshProfile,
      login,
      register,
      logout,
      sendPasswordRecoveryCode,
      verifyPasswordRecoveryCode,
      resetPasswordWithRecoveryCode,
    }),
    [
      user,
      session,
      isLoading,
      isProfileLoading,
      isRoleLoading,
      isAdmin,
      userRole,
      subscriptionPlan,
      subscriptionStatus,
      subscriptionEndDate,
      hasFeatureAccess,
      refreshProfile,
      sendPasswordRecoveryCode,
      verifyPasswordRecoveryCode,
      resetPasswordWithRecoveryCode,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
