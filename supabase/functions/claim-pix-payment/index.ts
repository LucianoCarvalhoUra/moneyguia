import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const { paymentId, lookupToken, planId, billingCycle, userId } = await req.json();
    if (!paymentId || !lookupToken || !planId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userRecord, error: userError } = await serviceClient.auth.admin.getUserById(String(userId));
    if (userError || !userRecord?.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .update({ user_id: userId })
      .eq("mp_payment_id", String(paymentId))
      .eq("payment_lookup_token", String(lookupToken))
      .select("id, status, plan_id, billing_cycle")
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "approved") {
      const now = new Date();
      const expiresAt = new Date(now);
      if ((billingCycle || payment.billing_cycle) === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      const { error: subError } = await serviceClient
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan_id: planId || payment.plan_id,
            billing_cycle: billingCycle || payment.billing_cycle || "monthly",
            status: "active",
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (subError) {
        throw subError;
      }
    }

    return new Response(JSON.stringify({ success: true, status: payment.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});