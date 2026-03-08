import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      }
    );
    const mpPayment = await mpResponse.json();
    console.log("MP payment status:", mpPayment.status);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update payment record
    const { data: payment, error: updateError } = await supabase
      .from("payments")
      .update({
        status: mpPayment.status,
        updated_at: new Date().toISOString(),
      })
      .eq("mp_payment_id", String(paymentId))
      .select("*")
      .single();

    if (updateError) {
      console.error("Update payment error:", updateError);
    }

    // If payment approved, activate subscription
    if (mpPayment.status === "approved" && payment) {
      const now = new Date();
      const expiresAt = new Date(now);
      if (payment.billing_cycle === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      const { error: subError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id: payment.user_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: "active",
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        console.error("Subscription activation error:", subError);
      } else {
        console.log("Subscription activated for user:", payment.user_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
