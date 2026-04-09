// @ts-nocheck
// v3 - public endpoint, sem JWT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  console.log("=== INICIANDO create-pix-payment ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Body recebido:", JSON.stringify(body));

    const { planId, billingCycle, amount, fullName, cpf, email } = body;

    if (!planId || !amount || !fullName || !cpf || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalAmount = Number(parseFloat(String(amount)).toFixed(2));
    console.log("Valor final:", finalAmount);

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    console.log("Token MP presente:", !!mpAccessToken);

    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpPayload = {
      transaction_amount: finalAmount,
      description: `Assinatura MoneyGuia - ${billingCycle === "yearly" ? "Anual" : "Mensal"}`,
      payment_method_id: "pix",
      payer: {
        email: email,
        first_name: fullName.split(" ")[0],
        last_name: fullName.split(" ").slice(1).join(" ") || fullName,
        identification: {
          type: "CPF",
          number: cpf.replace(/\D/g, ""),
        },
      },
    };

    console.log("Payload MP:", JSON.stringify(mpPayload));

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${email}-${planId}-${Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();
    console.log("MP status:", mpResponse.status);
    console.log("MP resposta:", JSON.stringify(mpData));

    if (!mpResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao gerar PIX", details: mpData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData = mpData.point_of_interaction?.transaction_data;

    // Salva no banco
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("payments").insert({
      plan_id: planId,
      billing_cycle: billingCycle || "monthly",
      amount: finalAmount,
      status: "pending",
      mp_payment_id: String(mpData.id),
      mp_qr_code: txData?.qr_code || null,
      mp_qr_code_base64: txData?.qr_code_base64 || null,
      mp_ticket_url: txData?.ticket_url || null,
    });

    return new Response(
      JSON.stringify({
        paymentId: mpData.id,
        qrCode: txData?.qr_code || null,
        qrCodeBase64: txData?.qr_code_base64 || null,
        ticketUrl: txData?.ticket_url || null,
        status: mpData.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("=== ERRO FATAL ===", err.message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});