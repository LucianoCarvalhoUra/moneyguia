import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Map auth errors to user-friendly messages
function getAuthErrorMessage(error: { message: string }): string {
  console.error('Auth error:', error);
  
  const message = error.message.toLowerCase();
  
  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos';
  }
  if (message.includes('email not confirmed')) {
    return 'E-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
  }
  if (message.includes('user already registered')) {
    return 'Este e-mail já está cadastrado';
  }
  if (message.includes('password')) {
    return 'A senha deve ter pelo menos 6 caracteres';
  }
  if (message.includes('email')) {
    return 'E-mail inválido';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  
  return 'Erro ao processar sua solicitação. Tente novamente.';
}
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Create profile on signup
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            createProfileIfNotExists(session.user);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const createProfileIfNotExists = async (user: User) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        user_id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        email: user.email,
      });
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
        data: {
          name,
        },
      },
    });

    if (error) {
      return { success: false, error: getAuthErrorMessage(error) };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!session, 
      isLoading, 
      login, 
      register, 
      logout 
    }}>
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
