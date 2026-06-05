// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, lookupToken } = await req.json();

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "paymentId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional ownership check via lookupToken or auth
    let payment;
    {
      let query = supabase
        .from("payments")
        .select("*")
        .eq("mp_payment_id", String(paymentId));

      if (lookupToken) {
        query = query.eq("payment_lookup_token", String(lookupToken));
      } else {
        // Allow lookup by paymentId only — used for guest checkout recovery.
        // If an auth header is present, scope to the authenticated user.
        const authHeader = req.headers.get("Authorization");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const bearerToken = authHeader?.startsWith("Bearer ")
          ? authHeader.replace("Bearer ", "")
          : null;
        if (bearerToken && bearerToken !== anonKey) {
          const userClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            anonKey,
            { global: { headers: { Authorization: authHeader! } } },
          );
          const { data: claims } = await userClient.auth.getClaims(bearerToken);
          if (claims?.claims?.sub) {
            query = query.eq("user_id", claims.claims.sub);
          }
        }
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payment = data;
    }

    // Fetch authoritative status from Mercado Pago
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${mpAccessToken}` } },
    );

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MP API error:", mpResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Mercado Pago API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mpPayment = await mpResponse.json();
    console.log("✅ MP payment:", mpPayment.id, "status:", mpPayment.status);

    // Update local payment record
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: mpPayment.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    // If approved and we have a user, activate subscription
    let subscriptionActivated = false;
    if (mpPayment.status === "approved" && payment.user_id) {
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
          { onConflict: "user_id" },
        );

      if (subError) {
        console.error("Subscription activation error:", subError);
      } else {
        subscriptionActivated = true;
        console.log("✅ Subscription activated for user:", payment.user_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: mpPayment.status,
        statusDetail: mpPayment.status_detail,
        dateApproved: mpPayment.date_approved,
        subscriptionActivated,
        needsAccountLink: mpPayment.status === "approved" && !payment.user_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
