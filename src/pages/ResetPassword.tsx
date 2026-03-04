import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  let label = 'Muito fraca';
  let color = 'bg-destructive';

  if (score >= 5) {
    label = 'Muito forte';
    color = 'bg-green-500';
  } else if (score >= 4) {
    label = 'Forte';
    color = 'bg-green-400';
  } else if (score >= 3) {
    label = 'Media';
    color = 'bg-yellow-500';
  } else if (score >= 2) {
    label = 'Fraca';
    color = 'bg-orange-500';
  }

  return { score, label, color, checks };
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    const bootstrapRecoverySession = async () => {
      setIsValidatingSession(true);

      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const code = queryParams.get('code');
        const flowType = hashParams.get('type') || queryParams.get('type');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const cameFromRecoveryLink =
          flowType === 'recovery'
          || !!accessToken
          || !!refreshToken
          || !!code
          || sessionStorage.getItem('password_reset_flow') === 'true';

        if (!data.session || !cameFromRecoveryLink) {
          toast.error('Sessao de recuperacao invalida. Solicite um novo link.');
          navigate('/auth', { replace: true });
          return;
        }

        sessionStorage.setItem('password_reset_flow', 'true');
        setHasRecoverySession(true);
        window.history.replaceState({}, document.title, '/reset-password');
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Nao foi possivel validar o link de recuperacao.';
        toast.error(message);
        navigate('/auth', { replace: true });
      } finally {
        setIsValidatingSession(false);
      }
    };

    bootstrapRecoverySession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas nao coincidem');
      return;
    }
    if (passwordStrength.score < 3) {
      toast.error('A senha esta fraca. Atenda pelo menos 3 requisitos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      sessionStorage.removeItem('password_reset_flow');

      setSuccessMessage('Senha atualizada! Redirecionando para o login...');
      toast.success('Senha atualizada!');
      setTimeout(() => navigate('/auth', { replace: true }), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar senha';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidatingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <p className="text-sm text-slate-500">Validando link de recuperacao...</p>
      </div>
    );
  }

  if (!hasRecoverySession) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Definir Nova Senha</CardTitle>
            <CardDescription>Digite e confirme sua nova senha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Forca da senha</span>
                    <span
                      className={cn(
                        'font-medium',
                        passwordStrength.score >= 4
                          ? 'text-green-500'
                          : passwordStrength.score >= 3
                            ? 'text-yellow-500'
                            : 'text-destructive',
                      )}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all duration-300', passwordStrength.color)}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {successMessage && (
                <p className="text-sm rounded-md bg-green-50 text-green-700 px-3 py-2">{successMessage}</p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
                disabled={isSubmitting || !!successMessage}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
