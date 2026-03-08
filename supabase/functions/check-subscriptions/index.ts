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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // 1. Find expired subscriptions and mark them as expired
    const { data: expired, error: expiredError } = await supabase
      .from("user_subscriptions")
      .update({ status: "expired", updated_at: now })
      .eq("status", "active")
      .lt("expires_at", now)
      .not("expires_at", "is", null)
      .select("user_id, plan_id, billing_cycle");

    if (expiredError) {
      console.error("Error expiring subscriptions:", expiredError);
    } else if (expired && expired.length > 0) {
      console.log(`Expired ${expired.length} subscriptions`);

      // Get free plan ID to assign
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("plan_type", "free")
        .single();

      if (freePlan) {
        for (const sub of expired) {
          // Create a new free subscription for each expired user
          await supabase.from("user_subscriptions").upsert(
            {
              user_id: sub.user_id,
              plan_id: freePlan.id,
              billing_cycle: "monthly",
              status: "active",
              starts_at: now,
              expires_at: null, // free plan never expires
            },
            { onConflict: "user_id" }
          );
        }
      }
    }

    // 2. Find subscriptions expiring in the next 5 days and send reminders
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const { data: expiringSoon } = await supabase
      .from("user_subscriptions")
      .select("user_id, expires_at, billing_cycle, subscription_plans(name)")
      .eq("status", "active")
      .gt("expires_at", now)
      .lte("expires_at", fiveDaysFromNow.toISOString())
      .not("expires_at", "is", null);

    if (expiringSoon && expiringSoon.length > 0) {
      console.log(`${expiringSoon.length} subscriptions expiring soon`);

      for (const sub of expiringSoon) {
        // Get user email from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("user_id", sub.user_id)
          .single();

        if (profile?.email) {
          const expiresDate = new Date(sub.expires_at!);
          const daysLeft = Math.ceil(
            (expiresDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          const planName = (sub.subscription_plans as any)?.name || "seu plano";

          // Send reminder email via existing send-email-smtp function
          try {
            await supabase.functions.invoke("send-email-smtp", {
              body: {
                to: profile.email,
                subject: `⚠️ Seu plano ${planName} vence em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Olá${profile.name ? `, ${profile.name}` : ""}!</h2>
                    <p>Seu plano <strong>${planName}</strong> no KeepMoney vence em <strong>${daysLeft} dia${daysLeft > 1 ? "s" : ""}</strong> (${expiresDate.toLocaleDateString("pt-BR")}).</p>
                    <p>Para continuar aproveitando todos os recursos, renove sua assinatura antes do vencimento.</p>
                    <p>Caso não renove, seu plano será automaticamente alterado para o <strong>Plano Gratuito</strong>.</p>
                    <p style="margin-top: 24px;">
                      <a href="https://keepmoney.lovable.app/plans" style="background-color: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Renovar agora</a>
                    </p>
                    <p style="margin-top: 24px; color: #666; font-size: 14px;">Equipe KeepMoney</p>
                  </div>
                `,
              },
            });
            console.log(`Reminder sent to ${profile.email}`);
          } catch (emailErr) {
            console.error(`Failed to send reminder to ${profile.email}:`, emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        expired: expired?.length || 0,
        reminders: expiringSoon?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check subscriptions error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
