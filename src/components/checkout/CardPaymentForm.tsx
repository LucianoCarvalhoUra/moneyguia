import { useState, useRef } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CardPaymentFormProps {
  planId: string;
  billingCycle: string;
  amount: number;
  fullName: string;
  cpf: string;
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function CardPaymentForm({
  planId,
  billingCycle,
  amount,
  fullName,
  cpf,
  email,
  onSuccess,
  onBack,
}: CardPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState(fullName);
  const [expirationMonth, setExpirationMonth] = useState("");
  const [expirationYear, setExpirationYear] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [installments, setInstallments] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const mpRef = useRef<any>(null);

  const loadMercadoPagoSDK = async () => {
    if (window.MercadoPago) {
      return true;
    }

    setSdkLoading(true);
    try {
      // Get public key from edge function
      const { data, error } = await supabase.functions.invoke("mercadopago-public-key");
      if (error || !data?.publicKey) {
        toast.error("Erro ao carregar gateway de pagamento");
        return false;
      }

      // Load MercadoPago.js SDK
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load MercadoPago SDK"));
        document.head.appendChild(script);
      });

      mpRef.current = new window.MercadoPago(data.publicKey, { locale: "pt-BR" });
      setSdkLoaded(true);
      return true;
    } catch (err) {
      console.error("SDK load error:", err);
      toast.error("Erro ao carregar SDK de pagamento");
      return false;
    } finally {
      setSdkLoading(false);
    }
  };

  // Load SDK on mount
  useState(() => {
    loadMercadoPagoSDK();
  });

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleSubmit = async () => {
    if (!cardNumber || !cardholderName || !expirationMonth || !expirationYear || !securityCode) {
      toast.error("Preencha todos os dados do cartão");
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      toast.error("Número do cartão inválido");
      return;
    }

    if (securityCode.length < 3) {
      toast.error("CVV inválido");
      return;
    }

    setSubmitting(true);
    try {
      // Ensure SDK is loaded
      if (!mpRef.current) {
        const loaded = await loadMercadoPagoSDK();
        if (!loaded) return;
      }

      // Get payment method info from bin
      const bin = cleanCardNumber.substring(0, 6);
      let paymentMethodId = "visa";
      let issuerId = "";

      // Create card token via SDK
      const cardTokenResponse = await mpRef.current.createCardToken({
        cardNumber: cleanCardNumber,
        cardholderName: cardholderName,
        cardExpirationMonth: expirationMonth,
        cardExpirationYear: expirationYear,
        securityCode: securityCode,
        identificationType: "CPF",
        identificationNumber: cpf.replace(/\D/g, ""),
      });

      if (!cardTokenResponse?.id) {
        toast.error("Erro ao processar dados do cartão. Verifique os dados e tente novamente.");
        return;
      }

      // Determine payment method from bin
      try {
        const binInfo = await mpRef.current.getPaymentMethods({ bin });
        if (binInfo?.results?.[0]) {
          paymentMethodId = binInfo.results[0].id;
          // Get issuer
          const issuers = await mpRef.current.getIssuers({ paymentMethodId, bin });
          if (issuers?.[0]) {
            issuerId = issuers[0].id;
          }
        }
      } catch {}

      // Send to edge function
      const { data, error } = await supabase.functions.invoke("create-card-payment", {
        body: {
          planId,
          billingCycle,
          amount,
          fullName,
          cpf,
          email,
          cardToken: cardTokenResponse.id,
          installments: Number(installments),
          paymentMethodId,
          issuerId,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data.status === "approved") {
        toast.success("Pagamento aprovado!");
        onSuccess();
      } else if (data.status === "in_process" || data.status === "pending") {
        toast.info("Pagamento em análise. Você será notificado quando for aprovado.");
        onSuccess();
      } else {
        const errorMessages: Record<string, string> = {
          cc_rejected_call_for_authorize: "Ligue para a operadora do cartão para autorizar.",
          cc_rejected_insufficient_amount: "Saldo insuficiente.",
          cc_rejected_bad_filled_security_code: "CVV inválido.",
          cc_rejected_bad_filled_date: "Data de validade inválida.",
          cc_rejected_bad_filled_other: "Dados do cartão incorretos.",
          cc_rejected_other_reason: "Cartão recusado. Tente outro cartão.",
        };
        const msg = errorMessages[data.statusDetail] || "Pagamento recusado. Tente novamente.";
        toast.error(msg);
      }
    } catch (err: any) {
      toast.error("Erro no pagamento: " + (err.message || "Tente novamente"));
    } finally {
      setSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => String(currentYear + i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-bold flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        Pagamento com Cartão de Crédito
      </h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="cardNumber">Número do cartão</Label>
          <Input
            id="cardNumber"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
          />
        </div>

        <div>
          <Label htmlFor="cardholderName">Nome no cartão</Label>
          <Input
            id="cardholderName"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
            placeholder="NOME COMO NO CARTÃO"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Mês</Label>
            <Select value={expirationMonth} onValueChange={setExpirationMonth}>
              <SelectTrigger>
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ano</Label>
            <Select value={expirationYear} onValueChange={setExpirationYear}>
              <SelectTrigger>
                <SelectValue placeholder="AAAA" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>

        <div>
          <Label>Parcelas</Label>
          <Select value={installments} onValueChange={setInstallments}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x de R$ {amount.toFixed(2).replace(".", ",")} (sem juros)</SelectItem>
              {amount >= 20 && (
                <SelectItem value="2">2x de R$ {(amount / 2).toFixed(2).replace(".", ",")} (sem juros)</SelectItem>
              )}
              {amount >= 30 && (
                <SelectItem value="3">3x de R$ {(amount / 3).toFixed(2).replace(".", ",")} (sem juros)</SelectItem>
              )}
              {amount >= 60 && (
                <SelectItem value="6">6x de R$ {(amount / 6).toFixed(2).replace(".", ",")} (sem juros)</SelectItem>
              )}
              {amount >= 120 && (
                <SelectItem value="12">12x de R$ {(amount / 12).toFixed(2).replace(".", ",")} (sem juros)</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleSubmit} disabled={submitting || sdkLoading} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando pagamento...
              </>
            ) : sdkLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              `Pagar R$ ${amount.toFixed(2).replace(".", ",")}`
            )}
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground">
            Voltar
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento processado de forma segura via Mercado Pago
        </p>
      </div>
    </div>
  );
}
