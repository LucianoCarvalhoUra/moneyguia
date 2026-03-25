import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowLeft, Sparkles } from 'lucide-react';
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
    label = 'Média';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const {
    login,
    sendPasswordRecoveryCode,
    verifyPasswordRecoveryCode,
    resetPasswordWithRecoveryCode,
  } = useAuth();
  const navigate = useNavigate();

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

  const handleTermsChange = (checked: boolean) => {
    setAcceptedTerms(checked);
    if (checked) {
      setTermsError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar aceite dos termos (exceto para recuperação de senha)
    if (!isRecovery && !acceptedTerms) {
      setTermsError(true);
      toast.error('Você precisa aceitar os termos para continuar');
      return;
    }
    
    setIsSubmitting(true);
    setTermsError(false);

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
            toast.error('Digite os 6 dígitos do código.');
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
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {/* Link para voltar à Home - canto superior esquerdo */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 text-sm text-slate-500 hover:text-emerald-600 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft size={18} />
        Voltar para a Home
      </Link>

      {/* Card centralizado */}
      <div className="w-full max-w-lg mx-4">
        <Card className="border-0 shadow-2xl shadow-emerald-950/5 rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-12">
            {/* Logo MoneyGuia */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-slate-900">MoneyGuia</span>
                  <p className="text-xs text-slate-500 font-medium">Controle Financeiro</p>
                </div>
              </div>
            </div>

            {/* Título e subtítulo */}
            <div className="text-center mb-8">
              <CardTitle className="text-3xl font-bold text-slate-900 mb-2">
                {isRecovery ? 'Recuperar Senha' : 'Bem-vindo de volta!'}
              </CardTitle>
              <CardDescription className="text-base text-slate-600">
                {isRecovery
                  ? recoveryStep === 'request'
                    ? 'Digite seu e-mail para receber um código de 6 dígitos'
                    : recoveryStep === 'verify'
                      ? 'Digite o código enviado para seu e-mail'
                      : 'Defina sua nova senha'
                  : 'Entre para acessar seu controle financeiro'}
              </CardDescription>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isRecovery && recoveryStep !== 'request'}
                  className="h-12 border-slate-200 rounded-xl px-4 text-base focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                />
              </div>

              {/* Campo OTP (quando aplicável) */}
              {isRecovery && recoveryStep === 'verify' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Código de 6 dígitos</Label>
                  <OtpCodeInput value={otpDigits} onChange={setOtpDigits} disabled={isSubmitting} />
                </div>
              )}

              {/* Campos de nova senha (quando aplicável) */}
              {isRecovery && recoveryStep === 'reset' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recovery-password" className="text-sm font-medium text-slate-700">Nova senha</Label>
                    <Input
                      id="recovery-password"
                      type="password"
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      required
                      className="h-12 border-slate-200 rounded-xl px-4 text-base focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recovery-confirm-password" className="text-sm font-medium text-slate-700">Confirmar senha</Label>
                    <Input
                      id="recovery-confirm-password"
                      type="password"
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      required
                      className="h-12 border-slate-200 rounded-xl px-4 text-base focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    />
                  </div>

                  {recoveryPassword.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Força da senha</span>
                        <span
                          className={cn(
                            'font-medium',
                            recoveryPasswordStrength.score >= 4
                              ? 'text-green-600'
                              : recoveryPasswordStrength.score >= 3
                                ? 'text-yellow-600'
                                : 'text-red-500',
                          )}
                        >
                          {recoveryPasswordStrength.label}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            recoveryPasswordStrength.color,
                          )}
                          style={{ width: `${(recoveryPasswordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Campo Senha (apenas quando não é recuperação) */}
              {!isRecovery && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setIsRecovery(true)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 border-slate-200 rounded-xl px-4 text-base focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  />
                </div>
              )}

              {/* Checkbox de Termos LGPD (apenas quando não é recuperação) */}
              {!isRecovery && (
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => handleTermsChange(e.target.checked)}
                        className={cn(
                          "peer h-5 w-5 shrink-0 rounded border-2 transition-all appearance-none cursor-pointer",
                          termsError 
                            ? "border-red-400 bg-red-50" 
                            : "border-slate-300 bg-white hover:border-emerald-400",
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
                    <span className={cn(
                      "text-sm transition-colors",
                      termsError ? "text-red-500" : "text-slate-600 group-hover:text-slate-700"
                    )}>
                      Aceito os termos de uso e a{' '}
                      <Link 
                        to="/terms" 
                        className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Política de Proteção de Dados (LGPD)
                      </Link>
                    </span>
                  </label>
                  {termsError && (
                    <p className="text-xs text-red-500 ml-8">
                      Você precisa aceitar os termos para continuar
                    </p>
                  )}
                </div>
              )}

              {/* Botão Entrar */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 bg-emerald-600 text-white font-semibold rounded-full shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 hover:shadow-emerald-300/50 transition-all duration-200 text-base mt-6"
                disabled={
                  isSubmitting
                  || (isRecovery && recoveryStep === 'request' && cooldown > 0)
                  || (isRecovery && recoveryStep === 'verify' && otpDigits.join('').length !== 6)
                  || (!isRecovery && !acceptedTerms)
                }
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Aguarde...
                  </span>
                ) : isRecovery ? (
                  recoveryStep === 'request' ? (
                    cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar código'
                  ) : recoveryStep === 'verify' ? (
                    'Validar código'
                  ) : (
                    'Salvar nova senha'
                  )
                ) : (
                  'Entrar'
                )}
              </Button>

              {/* Botão para reenviar código */}
              {isRecovery && (recoveryStep === 'verify' || recoveryStep === 'reset') && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-slate-500 hover:text-emerald-600"
                  onClick={resetRecoveryState}
                  disabled={isSubmitting}
                >
                  Alterar e-mail / reenviar código
                </Button>
              )}
            </form>

            {/* Link para checkout quando vem de lá */}
            {returnTo === 'checkout' && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const plan = localStorage.getItem('checkout_pending_plan');
                    const cycle = localStorage.getItem('checkout_pending_cycle');
                    navigate(`/checkout?plan=${plan}&cycle=${cycle}`);
                  }}
                  className="text-sm text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  ← Voltar para contratação do plano
                </button>
              </div>
            )}

            {/* Link para escolher plano */}
            {!isRecovery && isLogin && returnTo !== 'checkout' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Para criar uma conta,{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/plans')}
                    className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                  >
                    escolha um plano
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer discreto */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Protegido pela LGPD • Seus dados estão seguros
        </p>
      </div>
    </div>
  );
}
