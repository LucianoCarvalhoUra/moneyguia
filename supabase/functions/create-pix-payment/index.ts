// @ts-nocheck
// v5 - persist payment + notification_url + JWT validation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  console.log("=== create-pix-payment v5 ===");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { planId, billingCycle, amount, fullName, cpf, email } = body;

    if (!planId || !amount || !fullName || !cpf || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalAmount = Number(parseFloat(String(amount)).toFixed(2));
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pix-${userId}-${planId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: finalAmount,
        description: `Assinatura MoneyGuia - ${billingCycle === "yearly" ? "Anual" : "Mensal"}`,
        payment_method_id: "pix",
        notification_url: notificationUrl,
        payer: {
          email: email,
          first_name: fullName.split(" ")[0],
          last_name: fullName.split(" ").slice(1).join(" ") || fullName,
          identification: {
            type: "CPF",
            number: cpf.replace(/\D/g, ""),
          },
        },
      }),
    });

    const mpData = await mpResponse.json();
    console.log("MP status:", mpResponse.status, "id:", mpData?.id);

    if (!mpResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Erro MP", details: mpData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persist payment record so the webhook can find/update it
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceClient.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: billingCycle || "monthly",
      amount: finalAmount,
      status: mpData.status,
      mp_payment_id: String(mpData.id),
    });

    if (insertError) {
      console.error("Erro ao inserir payment:", insertError);
    }

    const txData = mpData.point_of_interaction?.transaction_data;

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
    console.error("ERRO FATAL:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
