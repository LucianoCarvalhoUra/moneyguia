import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Wallet, Copy, Check, QrCode, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const checkoutSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo Ã© obrigatÃ³rio").max(100),
  cpf: z.string().trim().min(11, "CPF invÃ¡lido").max(14),
  email: z.string().trim().email("E-mail invÃ¡lido").max(255),
  phone: z.string().trim().min(10, "Telefone invÃ¡lido").max(20),
  street: z.string().trim().min(3, "EndereÃ§o Ã© obrigatÃ³rio").max(200),
  number: z.string().trim().min(1, "NÃºmero Ã© obrigatÃ³rio").max(10),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().trim().min(2, "Bairro Ã© obrigatÃ³rio").max(100),
  city: z.string().trim().min(2, "Cidade Ã© obrigatÃ³ria").max(100),
  state: z.string().trim().min(2, "Estado Ã© obrigatÃ³rio").max(2),
  zipCode: z.string().trim().min(8, "CEP invÃ¡lido").max(10),
});

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
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
        toast.error("Plano nÃ£o encontrado");
        navigate("/plans");
      }
      setLoading(false);
    };

    fetchPlan();
  }, [planId, navigate]);

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

  const handleNext = () => {
    if (!validateForm()) return;
    setStep("payment");
  };

  const pixKey = "keepmoney@pagamentos.com.br";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!user || !plan) {
      toast.info("FaÃ§a login para confirmar o pagamento.");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          plan_id: plan.id,
          billing_cycle: cycle,
          status: "active",
          starts_at: new Date().toISOString(),
          expires_at: null,
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      setStep("confirmation");
      toast.success("Pagamento confirmado! Plano ativado.");
    } catch (err: any) {
      toast.error("Erro ao ativar plano: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-4">
          <button onClick={() => navigate("/plans")} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-gray-900">Checkout</span>
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
                    ? "bg-emerald-500 text-white"
                    : i < ["info", "payment", "confirmation"].indexOf(step)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-0.5 w-8 bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form / Payment */}
          <div className="lg:col-span-2">
            {step === "info" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-gray-900">InformaÃ§Ãµes pessoais</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      placeholder="Seu nome completo"
                    />
                    {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={form.cpf}
                      onChange={(e) => handleChange("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                    />
                    {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="seu@email.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>
                </div>

                <h2 className="mb-4 mt-8 text-xl font-bold text-gray-900">EndereÃ§o de cobranÃ§a</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={form.zipCode}
                      onChange={(e) => handleChange("zipCode", e.target.value)}
                      placeholder="00000-000"
                    />
                    {errors.zipCode && <p className="mt-1 text-xs text-red-500">{errors.zipCode}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="street">Rua / Avenida</Label>
                    <Input
                      id="street"
                      value={form.street}
                      onChange={(e) => handleChange("street", e.target.value)}
                      placeholder="Nome da rua"
                    />
                    {errors.street && <p className="mt-1 text-xs text-red-500">{errors.street}</p>}
                  </div>

                  <div>
                    <Label htmlFor="number">NÃºmero</Label>
                    <Input
                      id="number"
                      value={form.number}
                      onChange={(e) => handleChange("number", e.target.value)}
                      placeholder="123"
                    />
                    {errors.number && <p className="mt-1 text-xs text-red-500">{errors.number}</p>}
                  </div>

                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={form.complement}
                      onChange={(e) => handleChange("complement", e.target.value)}
                      placeholder="Apto, bloco..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={form.neighborhood}
                      onChange={(e) => handleChange("neighborhood", e.target.value)}
                      placeholder="Bairro"
                    />
                    {errors.neighborhood && <p className="mt-1 text-xs text-red-500">{errors.neighborhood}</p>}
                  </div>

                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="Cidade"
                    />
                    {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                  </div>

                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value.toUpperCase())}
                      placeholder="SP"
                      maxLength={2}
                    />
                    {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  className="mt-8 w-full rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  Continuar para pagamento
                </Button>
              </div>
            )}

            {step === "payment" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-bold text-gray-900">Pagamento via PIX</h2>

                <div className="flex flex-col items-center gap-6">
                  {/* QR Code placeholder */}
                  <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50">
                    <QrCode className="h-24 w-24 text-emerald-400" />
                  </div>

                  <p className="text-center text-sm text-gray-500">
                    Escaneie o QR code acima ou copie a chave PIX abaixo
                  </p>

                  {/* PIX key */}
                  <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <span className="flex-1 truncate text-sm font-mono text-gray-700">{pixKey}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPix}
                      className="shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>O PIX expira em 30 minutos</span>
                  </div>

                  <div className="flex w-full flex-col gap-3 pt-4">
                    <Button
                      onClick={handleConfirmPayment}
                      disabled={submitting}
                      className="w-full rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      {submitting ? "Processando..." : "JÃ¡ realizei o pagamento"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setStep("info")}
                      className="w-full text-gray-500"
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === "confirmation" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Pagamento confirmado!</h2>
                <p className="mt-2 text-gray-500">
                  Seu plano <strong>{plan?.name}</strong> foi ativado com sucesso.
                </p>
                <Link to="/dashboard">
                  <Button className="mt-6 rounded-md bg-emerald-500 px-8 text-white hover:bg-emerald-600">
                    Ir para o Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Resumo do pedido</h3>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plano</span>
                  <span className="font-semibold text-gray-900">{plan?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ciclo</span>
                  <span className="font-medium text-gray-700 capitalize">{priceLabel}</span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-extrabold text-emerald-600">
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

