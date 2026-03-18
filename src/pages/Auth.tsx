import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Wallet, TrendingUp, PieChart, Shield, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';

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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    login,
    register,
    sendPasswordRecoveryCode,
    verifyPasswordRecoveryCode,
    resetPasswordWithRecoveryCode,
  } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const recoveryPasswordStrength = useMemo(
    () => getPasswordStrength(recoveryPassword),
    [recoveryPassword],
  );

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('password_reset_verified_email');
    const savedCode = localStorage.getItem('password_reset_verified_code');
    if (savedEmail && savedCode) {
      setIsRecovery(true);
      setRecoveryStep('reset');
      setEmail(savedEmail);
      setVerifiedEmail(savedEmail);
      setOtpDigits(savedCode.split(''));
    }
  }, []);

  const resetRecoveryState = () => {
    setRecoveryStep('request');
    setOtpDigits(['', '', '', '', '', '']);
    setRecoveryPassword('');
    setRecoveryConfirmPassword('');
    setVerifiedEmail('');
    localStorage.removeItem('password_reset_verified_email');
    localStorage.removeItem('password_reset_verified_code');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRecovery) {
        if (recoveryStep === 'request') {
          if (cooldown > 0) {
            setIsSubmitting(false);
            return;
          }

          const result = await sendPasswordRecoveryCode(email);
          if (result.success) {
            toast.success('Código Enviado', {
              description: 'Verifique seu e-mail para o código de recuperação.',
            });
            setCooldown(60);
            setRecoveryStep('verify');
            setOtpDigits(['', '', '', '', '', '']);
          } else {
            toast.error('Falha no Envio', {
              description: result.error || 'Não foi possível enviar o código de recuperação.',
            });
          }
        } else if (recoveryStep === 'verify') {
          const token = otpDigits.join('');
          if (token.length !== 6) {
            toast.error('Digite os 6 digitos do codigo.');
            setIsSubmitting(false);
            return;
          }

          const result = await verifyPasswordRecoveryCode(email, token);
          if (result.success) {
            setVerifiedEmail(email);
            localStorage.setItem('password_reset_verified_email', email);
            localStorage.setItem('password_reset_verified_code', token);
            setRecoveryStep('reset');
            toast.success('Código Validado', {
              description: 'Agora você pode definir uma nova senha para sua conta.',
            });
          } else {
            toast.error('Código Inválido', {
              description: result.error || 'O código informado é inválido ou já expirou.',
            });
          }
        } else {
          if (recoveryPassword !== recoveryConfirmPassword) {
            toast.error('Senhas Divergentes', {
              description: 'As senhas informadas não coincidem. Tente novamente.',
            });
            setIsSubmitting(false);
            return;
          }
          if (recoveryPasswordStrength.score < 3) {
            toast.error('Senha Fraca', {
              description: 'Sua senha não atende aos requisitos mínimos de segurança.',
            });
            setIsSubmitting(false);
            return;
          }

          const result = await resetPasswordWithRecoveryCode(
            verifiedEmail || email,
            otpDigits.join(''),
            recoveryPassword,
          );
          if (!result.success) {
            toast.error('Erro ao Redefinir', {
              description: result.error || 'Não foi possível redefinir sua senha.',
            });
            setIsSubmitting(false);
            return;
          }

          resetRecoveryState();
          setIsRecovery(false);
          setIsLogin(true);
          toast.success('Senha Atualizada', {
            description: 'Sua senha foi redefinida. Você já pode fazer o login.',
          });
          navigate('/login', { replace: true });
        }
      } else {
        if (isLogin) {
          const result = await login(email, password);
          if (result.success) {
            toast.success('Login Efetuado', {
              description: 'Bem-vindo(a) de volta!',
            });

            if (returnTo === 'checkout') {
              const plan = localStorage.getItem('checkout_pending_plan');
              const cycle = localStorage.getItem('checkout_pending_cycle');
              navigate(`/checkout?plan=${plan}&cycle=${cycle}`);
            } else {
              navigate('/dashboard');
            }
          } else {
            toast.error('Falha no Login', {
              description: result.error || 'Verifique seu e-mail e senha.',
            });
          }
        } else {
          if (!name.trim()) {
            toast.error('Campo Obrigatório', { description: 'Por favor, informe seu nome completo.' });
            setIsSubmitting(false);
            return;
          }
          
          const result = await register(name, email, password);
          if (result.success) {
            toast.success('Conta Criada', {
              description: 'Seu cadastro foi realizado com sucesso!',
            });
            
            if (returnTo === 'checkout') {
              const plan = localStorage.getItem('checkout_pending_plan');
              const cycle = localStorage.getItem('checkout_pending_cycle');
              navigate(`/checkout?plan=${plan}&cycle=${cycle}`);
            } else {
              navigate('/dashboard');
            }
          } else {
            toast.error('Falha no Cadastro', { description: result.error || 'Não foi possível criar sua conta.' });
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Wallet, title: 'Controle Total', desc: 'Gerencie todas suas despesas em um so lugar' },
    { icon: TrendingUp, title: 'Analise Mensal', desc: 'Visualize seus gastos por categoria' },
    { icon: PieChart, title: 'Relatorios', desc: 'Graficos e resumos detalhados' },
    { icon: Shield, title: 'Seguro', desc: 'Seus dados protegidos e privados' },
  ];

  const passwordRequirements = [
    { key: 'minLength', label: 'Minimo 8 caracteres' },
    { key: 'hasUppercase', label: 'Letra maiuscula' },
    { key: 'hasLowercase', label: 'Letra minuscula' },
    { key: 'hasNumber', label: 'Numero' },
    { key: 'hasSpecial', label: 'Caractere especial (!@#$%...)' },
  ] as const;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold">MeuBudget</h1>
            </div>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              Controle seu orcamento pessoal de forma simples e eficiente
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-primary-foreground/70">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-scale-in">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">MeuBudget</h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">
                {isRecovery ? 'Recuperar Senha' : 'Bem-vindo de volta!'}
              </CardTitle>
              <CardDescription>
                {isRecovery
                  ? recoveryStep === 'request'
                    ? 'Digite seu e-mail para receber um codigo de 6 digitos'
                    : recoveryStep === 'verify'
                      ? 'Digite o codigo enviado para seu e-mail'
                      : 'Defina sua nova senha'
                  : 'Entre para acessar seu controle financeiro'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isRecovery && recoveryStep !== 'request'}
                  />
                </div>

                {isRecovery && recoveryStep === 'verify' && (
                  <div className="space-y-2">
                    <Label>Codigo de 6 digitos</Label>
                    <OtpCodeInput value={otpDigits} onChange={setOtpDigits} disabled={isSubmitting} />
                  </div>
                )}

                {isRecovery && recoveryStep === 'reset' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recovery-password">Nova senha</Label>
                      <Input
                        id="recovery-password"
                        type="password"
                        value={recoveryPassword}
                        onChange={(e) => setRecoveryPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recovery-confirm-password">Confirmar senha</Label>
                      <Input
                        id="recovery-confirm-password"
                        type="password"
                        value={recoveryConfirmPassword}
                        onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    {recoveryPassword.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Forca da senha</span>
                            <span
                              className={cn(
                                'font-medium',
                                recoveryPasswordStrength.score >= 4
                                  ? 'text-green-500'
                                  : recoveryPasswordStrength.score >= 3
                                    ? 'text-yellow-500'
                                    : 'text-destructive',
                              )}
                            >
                              {recoveryPasswordStrength.label}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all duration-300',
                                recoveryPasswordStrength.color,
                              )}
                              style={{ width: `${(recoveryPasswordStrength.score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!isRecovery && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    {isLogin && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => setIsRecovery(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  disabled={
                    isSubmitting
                    || (isRecovery && recoveryStep === 'request' && cooldown > 0)
                    || (isRecovery && recoveryStep === 'verify' && otpDigits.join('').length !== 6)
                  }
                >
                  {isSubmitting
                    ? 'Aguarde...'
                    : isRecovery
                      ? recoveryStep === 'request'
                        ? cooldown > 0
                          ? `Aguarde ${cooldown}s`
                          : 'Enviar codigo'
                        : recoveryStep === 'verify'
                          ? 'Validar codigo' : 'Salvar nova senha'
                      : isLogin
                        ? 'Entrar'
                        : 'Criar conta'}
                </Button>

                {isRecovery && (recoveryStep === 'verify' || recoveryStep === 'reset') && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={resetRecoveryState}
                    disabled={isSubmitting}
                  >
                    Alterar e-mail / reenviar codigo
                  </Button>
                )}
              </form>

              {/* Link para voltar ao checkout quando vem de lá */}
              {returnTo === 'checkout' && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const plan = localStorage.getItem('checkout_pending_plan');
                      const cycle = localStorage.getItem('checkout_pending_cycle');
                      navigate(`/checkout?plan=${plan}&cycle=${cycle}`);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ← Voltar para contratação do plano
                  </button>
                </div>
              )}

              {/* Mostrar mensagem para redirecionar para planos - apenas na tela de login e quando não vem do checkout */}
              {!isRecovery && isLogin && returnTo !== 'checkout' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Para criar uma conta,{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/plans')}
                      className="text-primary font-semibold hover:underline"
                    >
                      escolha um plano
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
