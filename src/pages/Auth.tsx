import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Wallet, TrendingUp, PieChart, Shield, Check, X } from 'lucide-react';
import { toast } from 'sonner';
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
  const [isRecovery, setIsRecovery] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, resetPassword } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRecovery) {
        if (cooldown > 0) {
          setIsSubmitting(false);
          return;
        }
        const result = await resetPassword(email);
        if (result.success) {
          toast.success('Se o e-mail estiver cadastrado, você receberá instruções em breve. Verifique também sua caixa de Spam');
          setCooldown(60);
          setIsRecovery(false);
          setIsLogin(true);
        } else {
          toast.error(result.error || 'Erro ao enviar link');
        }
      } else if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          toast.success('Login realizado com sucesso!');
          navigate('/dashboard');
        } else {
          toast.error(result.error || 'Erro ao fazer login');
        }
      } else {
        if (!name.trim()) {
          toast.error('Por favor, informe seu nome');
          setIsSubmitting(false);
          return;
        }
        if (passwordStrength.score < 3) {
          toast.error('Sua senha é muito fraca. Atenda pelo menos 3 requisitos.');
          setIsSubmitting(false);
          return;
        }
        const result = await register(name, email, password);
        if (result.success) {
          toast.success('Conta criada com sucesso!');
          navigate('/dashboard');
        } else {
          toast.error(result.error || 'Erro ao criar conta');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Wallet, title: 'Controle Total', desc: 'Gerencie todas suas despesas em um só lugar' },
    { icon: TrendingUp, title: 'Análise Mensal', desc: 'Visualize seus gastos por categoria' },
    { icon: PieChart, title: 'Relatórios', desc: 'Gráficos e resumos detalhados' },
    { icon: Shield, title: 'Seguro', desc: 'Seus dados protegidos e privados' },
  ];

  const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres' },
    { key: 'hasUppercase', label: 'Letra maiúscula' },
    { key: 'hasLowercase', label: 'Letra minúscula' },
    { key: 'hasNumber', label: 'Número' },
    { key: 'hasSpecial', label: 'Caractere especial (!@#$%...)' },
  ] as const;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold">MeuBudget</h1>
            </div>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              Controle seu orçamento pessoal de forma simples e eficiente
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

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">MeuBudget</h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">
                {isRecovery ? 'Recuperar Senha' : isLogin ? 'Bem-vindo de volta!' : 'Criar sua conta'}
              </CardTitle>
              <CardDescription>
                {isRecovery
                  ? 'Digite seu e-mail para receber o link de recuperação'
                  : isLogin
                  ? 'Entre para acessar seu controle financeiro'
                  : 'Comece a controlar suas finanças hoje'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && !isRecovery && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {!isRecovery && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    
                    {/* Forgot Password Link */}
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

                    {/* Password strength indicator - only show on register */}
                    {!isLogin && password.length > 0 && (
                    <div className="space-y-3 pt-2">
                      {/* Strength bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Força da senha</span>
                          <span className={cn(
                            "font-medium",
                            passwordStrength.score >= 4 ? "text-green-500" : 
                            passwordStrength.score >= 3 ? "text-yellow-500" : "text-destructive"
                          )}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-300", passwordStrength.color)}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Requirements checklist */}
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {passwordRequirements.map((req) => {
                          const isMet = passwordStrength.checks[req.key];
                          return (
                            <div 
                              key={req.key}
                              className={cn(
                                "flex items-center gap-1.5 transition-colors",
                                isMet ? "text-green-500" : "text-muted-foreground"
                              )}
                            >
                              {isMet ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                              <span>{req.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}
                  </div>
                )}
                <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground shadow hover:bg-primary/90" disabled={isSubmitting || (isRecovery && cooldown > 0)}>
                  {isSubmitting ? 'Aguarde...' : isRecovery ? (cooldown > 0 ? `Aguarde ${cooldown}s` : 'Enviar Instruções') : isLogin ? 'Entrar' : 'Criar conta'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isRecovery) {
                      setIsRecovery(false);
                      setIsLogin(true);
                    } else {
                      setIsLogin(!isLogin);
                    }
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isRecovery ? (
                    <>Voltar para o login</>
                  ) : isLogin ? (
                    <>
                      Não tem uma conta?{' '}
                      <span className="text-primary font-semibold">Cadastre-se</span>
                    </>
                  ) : (
                    <>
                      Já tem uma conta?{' '}
                      <span className="text-primary font-semibold">Faça login</span>
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
