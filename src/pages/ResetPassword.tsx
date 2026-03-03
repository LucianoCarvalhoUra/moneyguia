import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Check, X } from 'lucide-react';
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
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const passwordRequirements = [
    { key: 'minLength', label: 'Minimo 8 caracteres' },
    { key: 'hasUppercase', label: 'Letra maiuscula' },
    { key: 'hasLowercase', label: 'Letra minuscula' },
    { key: 'hasNumber', label: 'Numero' },
    { key: 'hasSpecial', label: 'Caractere especial (!@#$%...)' },
  ] as const;

  useEffect(() => {
    const verified = sessionStorage.getItem('password_reset_verified') === 'true';

    supabase.auth.getSession().then(({ data }) => {
      const hasSession = !!data.session;
      if (!verified && !hasSession) {
        toast.error('Sessao de recuperacao invalida. Solicite um novo codigo.');
        navigate('/auth', { replace: true });
        return;
      }
      setIsReady(true);
    });
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
      sessionStorage.removeItem('password_reset_verified');
      toast.success('Senha atualizada com sucesso!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <p className="text-sm text-slate-500">Validando sessao de recuperacao...</p>
      </div>
    );
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

              {password.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
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

                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {passwordRequirements.map((req) => {
                      const isMet = passwordStrength.checks[req.key];
                      return (
                        <div
                          key={req.key}
                          className={cn('flex items-center gap-1.5 transition-colors', isMet ? 'text-green-500' : 'text-muted-foreground')}
                        >
                          {isMet ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>{req.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirme a Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
