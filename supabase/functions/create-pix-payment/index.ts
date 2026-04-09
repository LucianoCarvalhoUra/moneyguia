// ✅ Função Pública - Não verifica JWT (configurado em supabase/config.toml verify_jwt = false)
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  console.log("✅ Handler iniciado:", req.method, new URL(req.url).pathname);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log("✅ Passou CORS check");

  try {
    // Parse seguro do body com log
    let body;
    try {
      body = await req.json();
      console.log("✅ Body recebido:", JSON.stringify(body, null, 2));
    } catch (e) {
      console.error("❌ Erro ao parsear body:", e.message);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Tornamos a autenticação opcional para permitir checkout antes de criar a conta
    const authHeader = req.headers.get("Authorization");
    let userId = null;

    if (authHeader?.startsWith("Bearer ")) {
      console.log("✅ Autenticação detectada, validando token...");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await supabase.auth.getClaims(token);
      userId = claimsData?.claims?.sub || null;
      console.log("✅ User ID identificado:", userId);
    } else {
      console.log("ℹ️ Requisição sem autenticação (checkout anônimo)");
    }

    const { planId, billingCycle, amount, fullName, cpf, email } = body;

    // CORREÇÃO: Força o valor para 2 casas decimais (ex: 0.15)
    const finalAmount = Number(parseFloat(String(amount)).toFixed(2));

    if (!planId || !amount || !fullName || !cpf || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create payment in Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${userId || email}-${planId}-${Date.now()}`
      },
      body: JSON.stringify({
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
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: "Erro ao gerar pagamento PIX", details: mpData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pointOfInteraction = mpData.point_of_interaction?.transaction_data;

    // Save payment record
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceClient.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: billingCycle || "monthly",
      amount: finalAmount,
      status: "pending",
      mp_payment_id: String(mpData.id),
      mp_qr_code: pointOfInteraction?.qr_code || null,
      mp_qr_code_base64: pointOfInteraction?.qr_code_base64 || null,
      mp_ticket_url: pointOfInteraction?.ticket_url || null,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        paymentId: mpData.id,
        qrCode: pointOfInteraction?.qr_code || null,
        qrCodeBase64: pointOfInteraction?.qr_code_base64 || null,
        ticketUrl: pointOfInteraction?.ticket_url || null,
        status: mpData.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
