import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function verifySignature(req: Request, dataId: string): boolean {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

  if (!secret) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET not configured — skipping signature validation");
    return true; // Allow through if secret not configured yet
  }

  if (!xSignature || !xRequestId) {
    console.warn("Missing x-signature or x-request-id headers");
    return false;
  }

  // Parse x-signature: ts=<timestamp>,v1=<hash>
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, ...valueParts] = part.split("=");
    parts[key.trim()] = valueParts.join("=").trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) {
    console.warn("Invalid x-signature format");
    return false;
  }

  // Build the manifest template
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(manifest);

  // Use Web Crypto API for HMAC
  return crypto.subtle
    .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((cryptoKey) => crypto.subtle.sign("HMAC", cryptoKey, msgData))
    .then((signature) => {
      const hashArray = Array.from(new Uint8Array(signature));
      const calculated = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Constant-time comparison
      if (calculated.length !== v1.length) return false;
      let result = 0;
      for (let i = 0; i < calculated.length; i++) {
        result |= calculated.charCodeAt(i) ^ v1.charCodeAt(i);
      }
      return result === 0;
    })
    .catch((err) => {
      console.error("Signature verification error:", err);
      return false;
    });
}

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

    // Validate webhook signature
    const isValid = await verifySignature(req, String(paymentId));
    if (!isValid) {
      console.error("Invalid webhook signature — rejecting request");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
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
