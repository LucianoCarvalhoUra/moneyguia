import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationSettings {
  user_id: string;
  is_enabled: boolean;
  email_enabled: boolean;
  days_before_due: number;
  notification_email: string | null;
  send_once_only: boolean;
  last_notification_date: string | null;
}

interface DueExpense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
}

interface PendingIncome {
  id: string;
  title: string;
  amount: number;
  receive_date: string;
}

function fmt(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");
}

function buildTableRows(rows: string[][]): string {
  return rows
    .map((cols) => "<tr>" + cols.map((c) => `<td style="padding:8px;border-bottom:1px solid #eee">${c}</td>`).join("") + "</tr>")
    .join("");
}

function buildEmail(
  todayStr: string,
  expenses: DueExpense[],
  incomes: PendingIncome[]
): string {
  const hasExpenses = expenses.length > 0;
  const hasIncomes = incomes.length > 0;

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);

  const expenseRows = buildTableRows(
    expenses.map((e) => [e.description || "Sem descrição", fmt(e.amount), fmtDate(e.due_date)])
  );

  const incomeRows = buildTableRows(
    incomes.map((i) => [i.title, fmt(i.amount), fmtDate(i.receive_date)])
  );

  const expensesSection = hasExpenses
    ? '<h3 style="color:#dc2626;margin:24px 0 8px">&#128197; Despesas a vencer (' + expenses.length + ")</h3>" +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:4px">' +
      '<thead><tr style="background:#f3f4f6">' +
      '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Descri&#231;&#227;o</th>' +
      '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Valor</th>' +
      '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Vencimento</th>' +
      "</tr></thead>" +
      "<tbody>" + expenseRows + "</tbody>" +
      '<tfoot><tr style="background:#f3f4f6;font-weight:bold">' +
      '<td style="padding:10px 8px;border-top:2px solid #e5e7eb">Total</td>' +
      '<td colspan="2" style="padding:10px 8px;border-top:2px solid #e5e7eb">' + fmt(totalExpenses) + "</td>" +
      "</tr></tfoot></table>"
    : "";

  const incomesSection = hasIncomes
    ? '<h3 style="color:#16a34a;margin:24px 0 8px">&#128176; Receitas a receber (' + incomes.length + ")</h3>" +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:4px">' +
      '<thead><tr style="background:#f3f4f6">' +
      '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Descri&#231;&#227;o</th>' +
      '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Valor</th>' +
      '<th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Previs&#227;o</th>' +
      "</tr></thead>" +
      "<tbody>" + incomeRows + "</tbody>" +
      '<tfoot><tr style="background:#f3f4f6;font-weight:bold">' +
      '<td style="padding:10px 8px;border-top:2px solid #e5e7eb">Total</td>' +
      '<td colspan="2" style="padding:10px 8px;border-top:2px solid #e5e7eb">' + fmt(totalIncomes) + "</td>" +
      "</tr></tfoot></table>"
    : "";

  const [year, month, day] = todayStr.split("-");
  const dateBR = `${day}/${month}/${year}`;

  return (
    "<!DOCTYPE html>" +
    '<html lang="pt-BR">' +
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">' +
    '<div style="background:#2563eb;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">' +
    '<h2 style="margin:0">Resumo financeiro MoneyGuia</h2>' +
    "</div>" +
    '<div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">' +
    "<p>Aqui est&#225; seu resumo de " + dateBR + ".</p>" +
    expensesSection +
    incomesSection +
    '<p style="color:#6b7280;font-size:12px;margin-top:24px">Acesse o MoneyGuia para gerenciar suas finan&#231;as.</p>' +
    "</div>" +
    "</body></html>"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: notificationSettings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("is_enabled", true)
      .eq("email_enabled", true);

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notification settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!notificationSettings || notificationSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with notifications enabled", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    let totalEmailsSent = 0;

    for (const settings of notificationSettings as NotificationSettings[]) {
      if (settings.send_once_only && settings.last_notification_date === todayStr) {
        continue;
      }

      if (!settings.notification_email) {
        continue;
      }

      const dueThreshold = new Date(today);
      dueThreshold.setDate(dueThreshold.getDate() + settings.days_before_due);
      const dueThresholdStr = dueThreshold.toISOString().split("T")[0];

      const { data: dueExpenses } = await supabase
        .from("expenses")
        .select("id, description, amount, due_date")
        .eq("user_id", settings.user_id)
        .eq("is_paid", false)
        .lte("due_date", dueThresholdStr)
        .gte("due_date", todayStr)
        .order("due_date", { ascending: true });

      const { data: pendingIncomes } = await supabase
        .from("incomes")
        .select("id, title, amount, receive_date")
        .eq("user_id", settings.user_id)
        .eq("is_received", false)
        .lte("receive_date", dueThresholdStr)
        .gte("receive_date", todayStr)
        .order("receive_date", { ascending: true });

      const expenses: DueExpense[] = dueExpenses ?? [];
      const incomes: PendingIncome[] = pendingIncomes ?? [];

      if (expenses.length === 0 && incomes.length === 0) {
        continue;
      }

      const html = buildEmail(todayStr, expenses, incomes);

      const expenseCount = expenses.length;
      const incomeCount = incomes.length;
      const parts: string[] = [];
      if (expenseCount > 0) parts.push(`${expenseCount} despesa(s) a vencer`);
      if (incomeCount > 0) parts.push(`${incomeCount} receita(s) a receber`);
      const subject = "MoneyGuia — " + parts.join(" e ");

      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ to: settings.notification_email, subject, html }),
        });

        if (emailResponse.ok) {
          totalEmailsSent++;
          await supabase
            .from("notification_settings")
            .update({ last_notification_date: todayStr })
            .eq("user_id", settings.user_id);
        } else {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email to ${settings.notification_email}:`, errorText);
        }
      } catch (emailError) {
        console.error(`Error sending email for user ${settings.user_id}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Financial summary completed",
        processed: notificationSettings.length,
        emailsSent: totalEmailsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("financial-summary error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
