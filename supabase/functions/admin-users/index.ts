// @ts-nocheck
// @ts-ignore - Edge Function usa import remoto no runtime Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MASTER_EMAIL = "lucianocarvalhoura@gmail.com";

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
    if (authError || !caller || caller.email?.toLowerCase() !== MASTER_EMAIL) {
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
        .select("user_id, name, email, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all active subscriptions
      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("user_id, plan_id, status, billing_cycle, expires_at, subscription_plans(plan_type, name)")
        .in("status", ["active", "trial"]);

      // Get all plans
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, name, plan_type")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      const subsMap: Record<string, any> = {};
      (subs || []).forEach((s: any) => {
        subsMap[s.user_id] = s;
      });

      const users = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        created_at: p.created_at,
        current_plan_type: subsMap[p.user_id]?.subscription_plans?.plan_type || "free",
        current_plan_name: subsMap[p.user_id]?.subscription_plans?.name || "Gratuito",
        subscription_status: subsMap[p.user_id]?.status || null,
        current_billing_cycle: subsMap[p.user_id]?.billing_cycle || null,
        current_expires_at: subsMap[p.user_id]?.expires_at || null,
      }));

      return new Response(JSON.stringify({ users, plans }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_user_plan") {
      const { user_id, plan_id, billing_cycle } = body;
      if (!user_id || !plan_id || !billing_cycle) {
        return new Response(JSON.stringify({ error: "user_id, plan_id e billing_cycle são obrigatórios" }), {
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

      const now = new Date();
      const expiresAt = new Date(now);
      if (billing_cycle === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
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
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) throw upsertError;

      return new Response(JSON.stringify({ success: true }), {
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
        "user_subscriptions", "payments", "user_roles", "profiles",
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
