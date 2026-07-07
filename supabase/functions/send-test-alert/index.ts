import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate user JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get notification settings for this user
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("notification_email, days_before_due")
      .eq("user_id", user.id)
      .maybeSingle();

    const targetEmail = settings?.notification_email || user.email;

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: "Nenhum email configurado para notificações" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const daysBefore = settings?.days_before_due ?? 3;
    const today = new Date().toISOString().split("T")[0];
    const future = new Date();
    future.setDate(future.getDate() + daysBefore + 7); // extra window for test
    const futureStr = future.toISOString().split("T")[0];

    // Fetch upcoming/overdue unpaid expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, description, amount, due_date")
      .eq("user_id", user.id)
      .eq("is_paid", false)
      .lte("due_date", futureStr)
      .order("due_date", { ascending: true })
      .limit(10);

    const hasExpenses = Array.isArray(expenses) && expenses.length > 0;

    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#2563eb;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">MoneyGuia — Email de Teste</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p>Olá! Este é um <strong>email de teste</strong> enviado pelo MoneyGuia para confirmar que suas notificações estão funcionando corretamente.</p>
          <p>Seu email de notificação configurado é: <strong>${targetEmail}</strong></p>
          <p style="color:#6b7280;font-size:13px">Se você não solicitou este teste, ignore este email.</p>
        </div>
      </body>
      </html>
    `;

    // Call send-email-smtp with service role key
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: targetEmail,
        subject: hasExpenses
          ? `[TESTE] MoneyGuia — ${expenses!.length} despesa(s) próxima(s) do vencimento`
          : "[TESTE] MoneyGuia — Notificações ativas",
        expenses: hasExpenses ? expenses : undefined,
        html: hasExpenses ? undefined : testHtml,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sentTo: targetEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-test-alert error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
