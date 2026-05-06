import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Wallet, Copy, Check, QrCode, Clock, Loader2, RefreshCw, CreditCard, User, Lock, Mail, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import CardPaymentForm from "@/components/checkout/CardPaymentForm";

// Password strength checker
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

const checkoutSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo é obrigatório").max(100),
  cpf: z.string().trim().min(11, "CPF inválido").max(14),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  street: z.string().trim().min(3, "Endereço é obrigatório").max(200),
  number: z.string().trim().min(1, "Número é obrigatório").max(10),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().trim().min(2, "Bairro é obrigatório").max(100),
  city: z.string().trim().min(2, "Cidade é obrigatória").max(100),
  state: z.string().trim().min(2, "Estado é obrigatório").max(2),
  zipCode: z.string().trim().min(8, "CEP inválido").max(10),
});

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
}

interface PixData {
  paymentId: string;
  lookupToken?: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  status: string;
}

type Step = "info" | "method" | "payment" | "create-account" | "confirmation";
type PaymentMethod = "pix" | "card";

// Initial form state
const initialFormState = {
  fullName: "",
  cpf: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
};

// Function to clear all sensitive data
const clearCheckoutData = () => {
  localStorage.removeItem("checkout_pending_form");
  localStorage.removeItem("checkout_pending_plan");
  localStorage.removeItem("checkout_pending_cycle");
  localStorage.removeItem("checkout_pending_pix");
  localStorage.removeItem("checkout_completed_data");
  sessionStorage.clear();
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, register, login, refreshProfile } = useAuth();

  const planId = searchParams.get("plan");
  const cycle = searchParams.get("cycle") || "monthly";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState<Step>("info");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Estado para criação de conta após pagamento
  const [accountForm, setAccountForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [recoverId, setRecoverId] = useState("");
  const [recovering, setRecovering] = useState(false);

  const handleRecoverPayment = async () => {
    const id = recoverId.trim();
    if (!id) {
      toast.error("Digite o ID do pagamento.");
      return;
    }
    setRecovering(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-pix-payment", {
        body: { paymentId: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const restored: PixData = {
        paymentId: id,
        lookupToken: null,
        qrCode: null,
        qrCodeBase64: null,
        ticketUrl: null,
        status: data?.status || "pending",
      };
      setPixData(restored);
      setPaymentMethod("pix");

      if (data?.status === "approved") {
        if (!user) {
          setAccountForm(prev => ({ ...prev, name: form.fullName }));
          setStep("create-account");
        } else {
          setStep("confirmation");
        }
        toast.success("Pagamento aprovado! Continue seu cadastro.");
      } else {
        setStep("payment");
        toast.info(`Status atual: ${data?.status || "pendente"}. Você pode continuar verificando.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível recuperar este pagamento.");
    } finally {
      setRecovering(false);
    }
  };

  const [form, setForm] = useState({
    fullName: "",
    cpf: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  // Cleanup on unmount - clear sensitive data
  useEffect(() => {
    return () => {
      // Clear form state on unmount
      setForm(initialFormState);
      setAccountForm({ name: "", password: "", confirmPassword: "" });
      setPixData(null);
    };
  }, []);

  useEffect(() => {
    const savedForm = localStorage.getItem("checkout_pending_form");
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        // Don't pre-fill passwords for security
        setForm({ ...parsed, password: "", confirmPassword: "" });
      } catch {}
    }

    // Restore pending PIX payment if there is one
    const savedPix = localStorage.getItem("checkout_pending_pix");
    if (savedPix) {
      try {
        const parsed = JSON.parse(savedPix);
        if (parsed?.paymentId) {
          setPixData(parsed);
          setPaymentMethod("pix");
          setStep("payment");
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!planId) {
      navigate("/planos");
      return;
    }

    const fetchPlan = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (data) {
        setPlan(data);
      } else {
        toast.error("Plano não encontrado");
        navigate("/planos");
      }
      setLoading(false);
    };

    fetchPlan();
  }, [planId, navigate]);

  // Poll payment status when on PIX payment step
  useEffect(() => {
    if (step !== "payment" || paymentMethod !== "pix" || !pixData?.paymentId) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("sync-pix-payment", {
          body: {
            paymentId: pixData.paymentId,
            lookupToken: pixData.lookupToken,
          },
        });

        if (!error && data?.status === "approved") {
          localStorage.removeItem("checkout_pending_pix");
          if (!user) {
            setAccountForm(prev => ({ ...prev, name: form.fullName }));
            setStep("create-account");
          } else {
            try { await refreshProfile?.(); } catch {}
            setStep("confirmation");
          }
          toast.success("Pagamento confirmado!");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };

    pollRef.current = window.setInterval(checkStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, pixData, paymentMethod, user, form.fullName]);

  const price = plan
    ? cycle === "yearly"
      ? plan.price_yearly
      : plan.price_monthly
    : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    const { data, error } = await supabase
      .from("coupons" as any)
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    const coupon = data as any;
    if (coupon && !error) {
      setDiscount(coupon.discount_percentage);
      toast.success(`Cupom aplicado! ${coupon.discount_percentage}% de desconto.`);
    } else {
      setDiscount(0);
      toast.error("Cupom inválido ou expirado.");
    }
    setIsValidatingCoupon(false);
  };

  const finalPrice = price * (1 - discount / 100);
  const isFreePlan = price === 0;
  const priceLabel = cycle === "yearly" ? "anual" : "mensal";
  
  // Password strength indicator
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const passwordRequirements = [
    { key: 'minLength', label: 'Mínimo 8 caracteres' },
    { key: 'hasUppercase', label: 'Letra maiúscula' },
    { key: 'hasLowercase', label: 'Letra minúscula' },
    { key: 'hasNumber', label: 'Número' },
    { key: 'hasSpecial', label: 'Símbolo (!@#$...)' },
  ] as const;
  
  // Auto-redirect after confirmation
  useEffect(() => {
    if (step === "confirmation") {
      const timer = setTimeout(() => {
        handleConfirmationRedirect();
      }, 3000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleChange("zipCode", value);

    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.street;
            delete newErrors.neighborhood;
            delete newErrors.city;
            delete newErrors.state;
            return newErrors;
          });
        } else {
          toast.error("CEP não encontrado.");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const validateForm = () => {
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleGoToMethod = async () => {
    if (!validateForm()) return;
    
    // Se é plano FREE, pular para confirmação
    if (isFreePlan) {
      setStep("confirmation");
      return;
    }
    
    setStep("method");
  };

  const handleSelectPix = async () => {
    setPaymentMethod("pix");

    // Guard: ensure required fields are filled before calling the edge function
    if (!form.fullName?.trim() || !form.cpf?.trim() || !form.email?.trim()) {
      toast.error("Preencha seus dados antes de continuar.");
      setStep("info");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: {
          planId: plan!.id,
          billingCycle: cycle,
          amount: finalPrice,
          fullName: form.fullName,
          cpf: form.cpf,
          email: form.email,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao gerar PIX");
      }

      if (data?.error) {
        console.error("❌ Erro retornado pela função:", data.error, data.details);
        throw new Error(data.error);
      }

      setPixData(data);
      // Persist so user can resume after refresh / closing tab
      try {
        localStorage.setItem("checkout_pending_pix", JSON.stringify(data));
        localStorage.setItem("checkout_pending_form", JSON.stringify({ ...form, password: "", confirmPassword: "" }));
      } catch {}
      setStep("payment");
    } catch (err: any) {
      toast.error("Erro ao gerar PIX: " + (err.message || "Tente novamente"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectCard = () => {
    setPaymentMethod("card");
    setStep("payment");
  };

  const handleCopyPix = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckPayment = async () => {
    setCheckingPayment(true);
    try {
      // Sincroniza diretamente com o Mercado Pago (não depende do webhook)
      const { data, error } = await supabase.functions.invoke("sync-pix-payment", {
        body: {
          paymentId: pixData?.paymentId || "",
          lookupToken: pixData?.lookupToken,
        },
      });

      if (error) throw error;

      if (data?.status === "approved") {
        if (!user) {
          setAccountForm(prev => ({ ...prev, name: form.fullName }));
          setStep("create-account");
        } else {
          setStep("confirmation");
        }
        toast.success("Pagamento confirmado!");
      } else if (data?.status === "pending" || data?.status === "in_process") {
        toast.info("Pagamento ainda não confirmado pelo Mercado Pago. Aguarde alguns instantes.");
      } else {
        toast.warning(`Status atual: ${data?.status || "desconhecido"}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao verificar pagamento.");
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCreateAccount = async () => {
    // Validações
    if (!accountForm.name.trim()) {
      setAccountErrors({ name: "Nome é obrigatório" });
      return;
    }
    if (!accountForm.password || accountForm.password.length < 6) {
      setAccountErrors({ password: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }
    if (accountForm.password !== accountForm.confirmPassword) {
      setAccountErrors({ confirmPassword: "As senhas não coincidem" });
      return;
    }

    setCreatingAccount(true);
    setAccountErrors({});

    try {
      // Criar usuário com o email do formulário de checkout
      const result = await register(accountForm.name, form.email, accountForm.password);
      
      if (result.success) {
        if (pixData?.paymentId && pixData?.lookupToken && result.userId && planId) {
          const { error: claimError, data: claimData } = await supabase.functions.invoke("claim-pix-payment", {
            body: {
              paymentId: pixData.paymentId,
              lookupToken: pixData.lookupToken,
              planId,
              billingCycle: cycle,
              userId: result.userId,
            },
          });

          if (claimError) {
            throw new Error(claimError.message || "Erro ao vincular pagamento à conta");
          }

          if (claimData?.error) {
            throw new Error(claimData.error);
          }
        }

        // Salvar dados do checkout pendentes para o webhook processar
        localStorage.setItem("checkout_completed_data", JSON.stringify({
          planId,
          cycle,
          userId: result.userId,
          form,
        }));
        
        toast.success("Conta criada com sucesso!");
        // Garante sessão ativa (signUp pode exigir confirmação de email em alguns ambientes)
        try { await login(form.email, accountForm.password); } catch {}
        // Atualiza o perfil/assinatura para que o ProtectedRoute libere o /dashboard
        try { await refreshProfile?.(); } catch {}
        setStep("confirmation");
        
        // Limpar dados sensíveis após sucesso
        setForm(initialFormState);
        setAccountForm({ name: "", password: "", confirmPassword: "" });
      } else {
        toast.error(result.error || "Erro ao criar conta");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setCreatingAccount(false);
    }
  };

  // Handle confirmation - clear all data after success
  const handleConfirmationRedirect = () => {
    clearCheckoutData();
    setForm(initialFormState);
    setAccountForm({ name: "", password: "", confirmPassword: "" });
    setPixData(null);
    navigate("/dashboard");
  };

  const stepIndex = ["info", "method", "payment", "create-account", "confirmation"].indexOf(step);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-4">
          <button onClick={() => navigate("/planos")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">Checkout</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Steps indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {["Dados", "Método", "Pagamento", "Confirmação"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${
                  i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : i < stepIndex
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm font-medium ${i === stepIndex ? "text-primary" : "text-muted-foreground"} hidden sm:block`}>
                {label}
              </span>
              {i < 3 && <div className="h-0.5 w-6 bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form / Payment */}
          <div className="lg:col-span-2">
            {step === "info" && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold">Informações pessoais</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Nome completo <span className="text-red-500">*</span></Label>
                    <Input id="fullName" autoComplete="off" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} placeholder="Seu nome completo" />
                    {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF <span className="text-red-500">*</span></Label>
                    <Input id="cpf" autoComplete="off" value={form.cpf} onChange={(e) => handleChange("cpf", e.target.value)} placeholder="000.000.000-00" />
                    {errors.cpf && <p className="mt-1 text-xs text-destructive">{errors.cpf}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone <span className="text-red-500">*</span></Label>
                    <Input id="phone" autoComplete="off" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(11) 99999-9999" />
                    {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">E-mail <span className="text-red-500">*</span></Label>
                    <Input id="email" type="email" autoComplete="off" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="seu@email.com" />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                  </div>
                  
                  {/* ✅ Campos de senha REMOVIDOS do formulário inicial. A senha é definida APÓS pagamento aprovado */}
                </div>

                {/* Only show address for paid plans */}
                {!isFreePlan && (
                  <>
                    <h2 className="mb-4 mt-8 text-xl font-bold">Endereço de cobrança</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor="zipCode">CEP <span className="text-red-500">*</span></Label>
                        <Input id="zipCode" autoComplete="off" value={form.zipCode} onChange={handleZipCodeChange} placeholder="00000-000" maxLength={9} />
                        {errors.zipCode && <p className="mt-1 text-xs text-destructive">{errors.zipCode}</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="street">Rua / Avenida <span className="text-red-500">*</span></Label>
                        <Input id="street" autoComplete="off" value={form.street} onChange={(e) => handleChange("street", e.target.value)} placeholder="Nome da rua" />
                        {errors.street && <p className="mt-1 text-xs text-destructive">{errors.street}</p>}
                      </div>
                      <div>
                        <Label htmlFor="number">Número <span className="text-red-500">*</span></Label>
                        <Input id="number" autoComplete="off" value={form.number} onChange={(e) => handleChange("number", e.target.value)} placeholder="123" />
                        {errors.number && <p className="mt-1 text-xs text-destructive">{errors.number}</p>}
                      </div>
                      <div>
                        <Label htmlFor="complement">Complemento</Label>
                        <Input id="complement" autoComplete="off" value={form.complement} onChange={(e) => handleChange("complement", e.target.value)} placeholder="Apto, bloco..." />
                      </div>
                      <div>
                        <Label htmlFor="neighborhood">Bairro <span className="text-red-500">*</span></Label>
                        <Input id="neighborhood" autoComplete="off" value={form.neighborhood} onChange={(e) => handleChange("neighborhood", e.target.value)} placeholder="Bairro" />
                        {errors.neighborhood && <p className="mt-1 text-xs text-destructive">{errors.neighborhood}</p>}
                      </div>
                      <div>
                        <Label htmlFor="city">Cidade <span className="text-red-500">*</span></Label>
                        <Input id="city" autoComplete="off" value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="Cidade" />
                        {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city}</p>}
                      </div>
                      <div>
                        <Label htmlFor="state">Estado <span className="text-red-500">*</span></Label>
                        <Input id="state" autoComplete="off" value={form.state} onChange={(e) => handleChange("state", e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
                        {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state}</p>}
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={handleGoToMethod} className="mt-8 w-full" type="button" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : isFreePlan ? (
                    user ? "Ativar plano gratuito" : "Criar Minha Conta Grátis"
                  ) : user ? (
                    "Continuar"
                  ) : (
                    "Criar conta e continuar"
                  )}
                </Button>
              </div>
            )}

            {step === "method" && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold">Escolha a forma de pagamento</h2>
                
                {(() => { console.log('Renderizando campo de cupom no Checkout...'); return null; })()}
                
                {/* Bloco de Cupom Forçado no Fluxo Principal */}
                <div className="mb-8 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                  <Label className="text-sm font-semibold mb-2 block">Possui um cupom de desconto?</Label>
                  <div className="flex gap-2">
                    <Input 
                      className="bg-background" 
                      placeholder="Digite seu código aqui" 
                      value={couponCode} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponCode(e.target.value.toUpperCase())} 
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleApplyCoupon} 
                      disabled={isValidatingCoupon || !couponCode}
                    >
                      {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                  {discount > 0 && (
                    <p className="mt-2 text-xs text-emerald-600 font-bold">✓ Desconto de {discount}% aplicado com sucesso!</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    onClick={handleSelectPix}
                    disabled={submitting}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    {submitting && paymentMethod === "pix" ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : (
                      <QrCode className="h-10 w-10 text-primary" />
                    )}
                    <span className="text-lg font-semibold">PIX</span>
                    <span className="text-sm text-muted-foreground">Aprovação instantânea</span>
                  </button>

                  <button
                    onClick={handleSelectCard}
                    disabled={submitting}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <CreditCard className="h-10 w-10 text-primary" />
                    <span className="text-lg font-semibold">Cartão de Crédito</span>
                    <span className="text-sm text-muted-foreground">Parcele em até 12x</span>
                  </button>
                </div>

                {/* Recuperar pagamento PIX existente */}
                <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                  <Label className="text-sm font-semibold mb-1 block">Já fez um PIX e quer continuar?</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cole o ID do pagamento (Mercado Pago) para recuperar e seguir o cadastro sem gerar um novo.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      className="bg-background"
                      placeholder="Ex: 156850283313"
                      value={recoverId}
                      onChange={(e) => setRecoverId(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={handleRecoverPayment}
                      disabled={recovering || !recoverId.trim()}
                    >
                      {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recuperar"}
                    </Button>
                  </div>
                </div>

                <Button variant="ghost" onClick={() => setStep("info")} className="mt-6 w-full text-muted-foreground">
                  Voltar
                </Button>
              </div>
            )}

            {step === "payment" && paymentMethod === "pix" && pixData && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold">Pagamento via PIX</h2>
                <div className="flex flex-col items-center gap-6">
                  {pixData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="h-48 w-48 rounded-2xl border border-border"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
                      <QrCode className="h-24 w-24 text-primary/40" />
                    </div>
                  )}
                  <p className="text-center text-sm text-muted-foreground">
                    Escaneie o QR code acima ou copie o código PIX abaixo
                  </p>
                  {pixData.qrCode && (
                    <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-border bg-muted p-3">
                      <span className="flex-1 truncate text-sm font-mono text-muted-foreground">
                        {pixData.qrCode.substring(0, 50)}...
                      </span>
                      <Button variant="ghost" size="sm" onClick={handleCopyPix} className="shrink-0">
                        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>O PIX expira em 30 minutos</span>
                  </div>
                  <div className="flex w-full flex-col gap-3 pt-4">
                    <Button onClick={handleCheckPayment} disabled={checkingPayment} className="w-full">
                      {checkingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Verificar pagamento
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      O pagamento é verificado automaticamente a cada 5 segundos
                    </p>
                    <Button variant="ghost" onClick={() => setStep("method")} className="w-full text-muted-foreground">
                      Voltar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === "payment" && paymentMethod === "card" && (
              <CardPaymentForm
                planId={plan!.id}
                billingCycle={cycle}
                amount={finalPrice}
                fullName={form.fullName}
                cpf={form.cpf}
                email={form.email}
                onSuccess={() => {
                  if (!user) {
                    setAccountForm(prev => ({ ...prev, name: form.fullName }));
                    setStep("create-account");
                  } else {
                    setStep("confirmation");
                  }
                }}
                onBack={() => setStep("method")}
              />
            )}

            {step === "create-account" && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="text-center mb-6">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Crie sua senha</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Defina uma senha para acessar sua conta. Use pelo menos 6 caracteres.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="account-name"
                        value={accountForm.name}
                        onChange={(e) => {
                          setAccountForm(prev => ({ ...prev, name: e.target.value }));
                          if (accountErrors.name) setAccountErrors(prev => ({ ...prev, name: "" }));
                        }}
                        placeholder="Seu nome completo"
                        className="pl-10"
                      />
                    </div>
                    {accountErrors.name && <p className="text-xs text-destructive">{accountErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="account-email"
                        value={form.email}
                        disabled
                        className="pl-10 bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="account-password"
                        type="password"
                        value={accountForm.password}
                        onChange={(e) => {
                          setAccountForm(prev => ({ ...prev, password: e.target.value }));
                          if (accountErrors.password) setAccountErrors(prev => ({ ...prev, password: "" }));
                        }}
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10"
                      />
                    </div>
                    {accountErrors.password && <p className="text-xs text-destructive">{accountErrors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-confirm-password">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="account-confirm-password"
                        type="password"
                        value={accountForm.confirmPassword}
                        onChange={(e) => {
                          setAccountForm(prev => ({ ...prev, confirmPassword: e.target.value }));
                          if (accountErrors.confirmPassword) setAccountErrors(prev => ({ ...prev, confirmPassword: "" }));
                        }}
                        placeholder="Repita sua senha"
                        className="pl-10"
                      />
                    </div>
                    {accountErrors.confirmPassword && <p className="text-xs text-destructive">{accountErrors.confirmPassword}</p>}
                  </div>
                </div>

                <Button 
                  onClick={handleCreateAccount} 
                  disabled={creatingAccount}
                  className="mt-6 w-full"
                >
                  {creatingAccount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
                </p>
              </div>
            )}

            {step === "confirmation" && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-primary/10">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">
                  {isFreePlan ? "🚀 Seja bem-vindo ao MoneyGuia!" : "Pagamento confirmado!"}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {isFreePlan 
                    ? "Seu plano Essencial foi ativado. Sua jornada para a liberdade financeira começa agora."
                    : `Seu plano ${plan?.name} foi ativado com sucesso.`
                  }
                </p>
                <Button onClick={handleConfirmationRedirect} className="mt-6 px-8">Ir para o Dashboard</Button>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold">Resumo do pedido</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="font-semibold">{plan?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ciclo</span>
                    <span className="font-medium capitalize">{priceLabel}</span>
                  </div>
                  <div className="pt-2">
                    <Label className="text-xs uppercase text-muted-foreground">Possui um cupom?</Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        className="h-8 text-xs font-mono" 
                        placeholder="CÓDIGO" 
                        value={couponCode} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponCode(e.target.value)} 
                      />
                      <Button 
                        size="sm" 
                        className="h-8" 
                        variant="outline" 
                        onClick={handleApplyCoupon} 
                        disabled={isValidatingCoupon}
                      >
                        {isValidatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplicar"}
                      </Button>
                    </div>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                      <span>Desconto ({discount}%)</span>
                      <span>- R$ {((price * discount) / 100).toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-extrabold text-primary">
                        R$ {finalPrice.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {stepIndex > 0 && step !== "confirmation" && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Seus dados</h3>
                    <Button variant="ghost" size="sm" onClick={() => setStep("info")} className="h-auto px-2 py-1 text-xs text-primary hover:text-primary/80">
                      Editar
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{form.fullName}</p>
                    <p>{form.email}</p>
                    <p>CPF: {form.cpf}</p>
                    <p>{form.phone}</p>
                    <p className="pt-1">{form.street}, {form.number}{form.complement ? ` - ${form.complement}` : ""}</p>
                    <p>{form.neighborhood} - {form.city}/{form.state}</p>
                    <p>CEP: {form.zipCode}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
