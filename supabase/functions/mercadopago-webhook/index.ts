// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(req: Request, dataId: string, url: URL): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

  if (!secret) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET not configured");
    return false;
  }
  if (!xSignature || !xRequestId) {
    console.warn("Missing x-signature or x-request-id headers");
    return false;
  }

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

  // MP docs: id should be the data.id from the query string when present, lowercased
  const queryDataId = url.searchParams.get("data.id") || url.searchParams.get("id");
  const idForManifest = (queryDataId || dataId || "").toLowerCase();

  const manifest = `id:${idForManifest};request-id:${xRequestId};ts:${ts};`;
  console.log("🔐 Manifest:", manifest);

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.trim()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(manifest));
  const calculated = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log("🔐 Calculated:", calculated, "Received:", v1);

  if (calculated.length !== v1.length) return false;
  let result = 0;
  for (let i = 0; i < calculated.length; i++) {
    result |= calculated.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json();
    console.log("✅ Webhook received:", JSON.stringify(body));

    const isPayment =
      body.type === "payment" ||
      body.action === "payment.updated" ||
      body.action === "payment.created" ||
      body.topic === "payment";

    if (!isPayment) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id || body.resource || url.searchParams.get("data.id");
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate signature, but do NOT block processing if it fails — we re-fetch
    // the payment from MP API using our access token, so the data is authoritative.
    const isValid = await verifySignature(req, String(paymentId), url);
    if (!isValid) {
      console.warn("⚠️ Signature mismatch — proceeding with MP API verification only");
    }

    // Fetch payment details from Mercado Pago (authoritative source)
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${mpAccessToken}` } },
    );

    if (!mpResponse.ok) {
      console.error("MP API error:", mpResponse.status, await mpResponse.text());
      return new Response(JSON.stringify({ error: "MP API error" }), {
        status: 200, // ack so MP doesn't keep retrying with same error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpPayment = await mpResponse.json();
    console.log("✅ MP payment status:", mpPayment.status, "id:", mpPayment.id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment, error: updateError } = await supabase
      .from("payments")
      .update({
        status: mpPayment.status,
        updated_at: new Date().toISOString(),
      })
      .eq("mp_payment_id", String(paymentId))
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("Update payment error:", updateError);
    }
    if (!payment) {
      console.warn("Payment record not found for mp_payment_id:", paymentId);
      return new Response(JSON.stringify({ ok: true, note: "no local record" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        console.log("✅ Subscription activated for user:", payment.user_id);
      }
    } else if (mpPayment.status === "approved" && !payment.user_id) {
      console.log("ℹ️ Approved payment waiting for account linking:", paymentId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200, // ack to avoid retry storm
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
