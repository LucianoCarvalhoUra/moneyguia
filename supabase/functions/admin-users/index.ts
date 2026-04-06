// @ts-nocheck
// @ts-ignore - Edge Function usa import remoto no runtime Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();

    // Verifica se o usuário é admin consultando a tabela profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', caller?.id)
      .single();

    if (authError || !caller || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...body } = await req.json();

    if (action === "list_users") {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, created_at, lgpd_accepted_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all active subscriptions
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("user_id, plan_id, status, billing_cycle, starts_at, expires_at, created_at, subscription_plans(plan_type, name)")
        .in("status", ["active", "trial"]);

      // Get all plans
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, name, plan_type")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      const subsMap: Record<string, any> = {};
      (subs || []).forEach((s: any) => {
        const current = subsMap[s.user_id];
        if (!current) {
          subsMap[s.user_id] = s;
          return;
        }

        const currentCreatedAt = new Date(current.created_at || 0).getTime();
        const nextCreatedAt = new Date(s.created_at || 0).getTime();
        if (nextCreatedAt >= currentCreatedAt) {
          subsMap[s.user_id] = s;
        }
      });

      const users = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        created_at: p.created_at,
        lgpd_accepted_at: p.lgpd_accepted_at || null,
        current_plan_type: subsMap[p.user_id]?.subscription_plans?.plan_type || "free",
        current_plan_name: subsMap[p.user_id]?.subscription_plans?.name || "Gratuito",
        subscription_status: subsMap[p.user_id]?.status || null,
        current_billing_cycle: subsMap[p.user_id]?.billing_cycle || null,
        current_starts_at: subsMap[p.user_id]?.starts_at || null,
        current_expires_at: subsMap[p.user_id]?.expires_at || null,
      }));

      return new Response(JSON.stringify({ users, plans }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_user_plan") {
      const { user_id, plan_id, billing_cycle, starts_at, expires_at } = body;
      if (!user_id || !plan_id || !billing_cycle || !starts_at) {
        return new Response(JSON.stringify({ error: "user_id, plan_id, billing_cycle e starts_at são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["monthly", "yearly"].includes(billing_cycle)) {
        return new Response(JSON.stringify({ error: "billing_cycle inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const startsAt = new Date(starts_at);
      if (Number.isNaN(startsAt.getTime())) {
        return new Response(JSON.stringify({ error: "starts_at inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let computedExpiresAt = new Date(startsAt);
      if (billing_cycle === "yearly") {
        computedExpiresAt.setFullYear(computedExpiresAt.getFullYear() + 1);
      } else {
        computedExpiresAt.setMonth(computedExpiresAt.getMonth() + 1);
      }

      if (expires_at) {
        const incomingExpiresAt = new Date(expires_at);
        if (!Number.isNaN(incomingExpiresAt.getTime())) {
          computedExpiresAt = incomingExpiresAt;
        }
      }

      if (Number.isNaN(computedExpiresAt.getTime())) {
        return new Response(JSON.stringify({ error: "expires_at inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert subscription
      const { error: upsertError } = await supabase
        .from("user_subscriptions")
        .upsert(
          {
            user_id,
            plan_id,
            billing_cycle,
            status: "active",
            starts_at: startsAt.toISOString(),
            expires_at: computedExpiresAt.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) throw upsertError;

      const { data: persistedSub, error: persistedSubError } = await supabase
        .from("user_subscriptions")
        .select("expires_at")
        .eq("user_id", user_id)
        .maybeSingle();

      if (persistedSubError) throw persistedSubError;

      if (!persistedSub?.expires_at) {
        const { error: forceExpiryError } = await supabase
          .from("user_subscriptions")
          .update({ expires_at: computedExpiresAt.toISOString() })
          .eq("user_id", user_id);

        if (forceExpiryError) throw forceExpiryError;
      }

      return new Response(JSON.stringify({ success: true, expires_at: computedExpiresAt.toISOString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete all user data from public tables
      const tables = [
        "notification_settings", "expenses", "incomes", "subcategories",
        "income_subcategories", "categories", "income_categories",
        "credit_cards", "bank_accounts", "goal_contributions", "goals",
        "user_subscriptions", "payments", "profiles",
      ];
      for (const table of tables) {
        await supabase.from(table).delete().eq("user_id", user_id);
      }

      // Delete from auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id);
      if (authDeleteError) throw authDeleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
