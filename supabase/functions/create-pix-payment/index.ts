import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
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
    const userEmail = claimsData.claims.email;

    const { planId, billingCycle, amount, fullName, cpf, email } = await req.json();

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
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
        "X-Idempotency-Key": `${userId}-${planId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description: `Assinatura KeepMoney - ${billingCycle === "yearly" ? "Anual" : "Mensal"}`,
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
      amount: Number(amount),
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
