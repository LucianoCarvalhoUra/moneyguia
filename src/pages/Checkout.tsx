import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Wallet, Copy, Check, QrCode, Clock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

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
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  status: string;
}

type Step = "info" | "payment" | "confirmation";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planId = searchParams.get("plan");
  const cycle = searchParams.get("cycle") || "monthly";

  const [plan, setPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    cpf: "",
    email: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    if (!planId) {
      navigate("/plans");
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
        navigate("/plans");
      }
      setLoading(false);
    };

    fetchPlan();
  }, [planId, navigate]);

  // Poll payment status when on payment step
  useEffect(() => {
    if (step !== "payment" || !pixData?.paymentId) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("status")
          .eq("mp_payment_id", pixData.paymentId)
          .single();

        if (!error && data?.status === "approved") {
          setStep("confirmation");
          toast.success("Pagamento confirmado! Plano ativado.");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };

    pollRef.current = window.setInterval(checkStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, pixData]);

  const price = plan
    ? cycle === "yearly"
      ? plan.price_yearly
      : plan.price_monthly
    : 0;

  const priceLabel = cycle === "yearly" ? "anual" : "mensal";

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
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

  const handleNext = async () => {
    if (!validateForm()) return;

    if (!user) {
      toast.info("Faça login para continuar.");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: {
          planId: plan!.id,
          billingCycle: cycle,
          amount: price,
          fullName: form.fullName,
          cpf: form.cpf,
          email: form.email,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setPixData(data);
      setStep("payment");
    } catch (err: any) {
      toast.error("Erro ao gerar PIX: " + (err.message || "Tente novamente"));
    } finally {
      setSubmitting(false);
    }
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
      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("mp_payment_id", pixData?.paymentId || "")
        .single();

      if (data?.status === "approved") {
        setStep("confirmation");
        toast.success("Pagamento confirmado! Plano ativado.");
      } else {
        toast.info("Pagamento ainda não confirmado. Aguarde alguns instantes.");
      }
    } catch {
      toast.error("Erro ao verificar pagamento.");
    } finally {
      setCheckingPayment(false);
    }
  };

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
          <button onClick={() => navigate("/plans")} className="text-muted-foreground hover:text-foreground">
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
          {(["info", "payment", "confirmation"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : i < ["info", "payment", "confirmation"].indexOf(step)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-0.5 w-8 bg-border" />}
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
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input id="fullName" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} placeholder="Seu nome completo" />
                    {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={form.cpf} onChange={(e) => handleChange("cpf", e.target.value)} placeholder="000.000.000-00" />
                    {errors.cpf && <p className="mt-1 text-xs text-destructive">{errors.cpf}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(11) 99999-9999" />
                    {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="seu@email.com" />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>

                <h2 className="mb-4 mt-8 text-xl font-bold">Endereço de cobrança</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input id="zipCode" value={form.zipCode} onChange={(e) => handleChange("zipCode", e.target.value)} placeholder="00000-000" />
                    {errors.zipCode && <p className="mt-1 text-xs text-destructive">{errors.zipCode}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="street">Rua / Avenida</Label>
                    <Input id="street" value={form.street} onChange={(e) => handleChange("street", e.target.value)} placeholder="Nome da rua" />
                    {errors.street && <p className="mt-1 text-xs text-destructive">{errors.street}</p>}
                  </div>
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" value={form.number} onChange={(e) => handleChange("number", e.target.value)} placeholder="123" />
                    {errors.number && <p className="mt-1 text-xs text-destructive">{errors.number}</p>}
                  </div>
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input id="complement" value={form.complement} onChange={(e) => handleChange("complement", e.target.value)} placeholder="Apto, bloco..." />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" value={form.neighborhood} onChange={(e) => handleChange("neighborhood", e.target.value)} placeholder="Bairro" />
                    {errors.neighborhood && <p className="mt-1 text-xs text-destructive">{errors.neighborhood}</p>}
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="Cidade" />
                    {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" value={form.state} onChange={(e) => handleChange("state", e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
                    {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state}</p>}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  disabled={submitting}
                  className="mt-8 w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    "Continuar para pagamento"
                  )}
                </Button>
              </div>
            )}

            {step === "payment" && pixData && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold">Pagamento via PIX</h2>

                <div className="flex flex-col items-center gap-6">
                  {/* QR Code */}
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

                  {/* PIX copy-paste */}
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

                  <div className="flex items-center gap-2 text-sm text-destructive">
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
                    <Button variant="ghost" onClick={() => setStep("info")} className="w-full text-muted-foreground">
                      Voltar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === "confirmation" && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-primary/10">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Pagamento confirmado!</h2>
                <p className="mt-2 text-muted-foreground">
                  Seu plano <strong>{plan?.name}</strong> foi ativado com sucesso.
                </p>
                <Link to="/dashboard">
                  <Button className="mt-6 px-8">Ir para o Dashboard</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-extrabold text-primary">
                      R$ {price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
