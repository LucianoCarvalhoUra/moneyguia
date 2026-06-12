import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationSettings {
  user_id: string;
  is_enabled: boolean;
  email_enabled: boolean;
  days_before_due: number;
  notification_email: string | null;
  send_once_only: boolean;
  last_notification_date: string | null;
  alert_overdue_expenses: boolean;
  alert_upcoming_expenses: boolean;
  alert_pending_incomes: boolean;
  alert_received_incomes: boolean;
  frequency: "daily" | "weekly" | "monthly";
  send_hour: number;
  send_minute: number;
}

// Current hour in America/Sao_Paulo (UTC-3, no DST)
function brasiliaNow(): { date: string; hour: number; minute: number } {
  const nowUtc = new Date();
  const sp = new Date(nowUtc.getTime() - 3 * 60 * 60 * 1000);
  return {
    date: sp.toISOString().split("T")[0],
    hour: sp.getUTCHours(),
    minute: sp.getUTCMinutes(),
  };
}

interface Row {
  id: string;
  description: string;
  amount: number;
  date: string;
}

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");

function shouldSendByFrequency(
  frequency: string,
  todayStr: string,
  last: string | null,
): boolean {
  if (!last) return true;
  const today = new Date(`${todayStr}T00:00:00`);
  const lastDate = new Date(`${last}T00:00:00`);
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
  if (frequency === "daily") return diffDays >= 1;
  if (frequency === "weekly") return diffDays >= 7;
  if (frequency === "monthly") return diffDays >= 28;
  return true;
}

function buildSection(title: string, color: string, rows: Row[]): string {
  if (!rows.length) return "";
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const trs = rows
    .map(
      (r) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${r.description}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${fmtMoney(r.amount)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${fmtDate(r.date)}</td>
      </tr>`,
    )
    .join("");
  return `
    <h3 style="color:${color};margin:24px 0 8px;">${title} (${rows.length})</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb;">Descrição</th>
        <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb;">Valor</th>
        <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb;">Data</th>
      </tr></thead>
      <tbody>${trs}</tbody>
      <tfoot><tr style="background:#f9fafb;font-weight:bold;">
        <td style="padding:10px 8px;">Total</td>
        <td colspan="2" style="padding:10px 8px;">${fmtMoney(total)}</td>
      </tr></tfoot>
    </table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let force = false;
    try {
      const b = await req.json();
      force = !!b?.force;
    } catch (_e) {
      // no body
    }

    const { data: allSettings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("is_enabled", true)
      .eq("email_enabled", true);

    if (settingsError) {
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sp = brasiliaNow();
    const today = new Date(`${sp.date}T00:00:00`);
    const todayStr = sp.date;
    const currentHour = sp.hour;
    const currentMinute = sp.minute;
    let totalEmailsSent = 0;

    console.log(
      "check-due-expenses run:",
      JSON.stringify({
        force,
        processed: allSettings?.length || 0,
        todayStr,
        currentHour,
        currentMinute,
      }),
    );

    for (const s of (allSettings || []) as NotificationSettings[]) {
      if (!s.notification_email) continue;
      // Hour-and-minute match (skipped when forced from "Enviar agora")
      const desiredHour = typeof s.send_hour === "number" ? s.send_hour : 9;
      const desiredMinute = typeof s.send_minute === "number" ? s.send_minute : 0;
      if (!force && (desiredHour !== currentHour || desiredMinute !== currentMinute)) continue;
      if (!force && !shouldSendByFrequency(s.frequency || "daily", todayStr, s.last_notification_date))
        continue;

      console.log(
        "notification matched:",
        JSON.stringify({
          userId: s.user_id,
          force,
          frequency: s.frequency,
          lastNotificationDate: s.last_notification_date,
          desiredHour,
          desiredMinute,
          currentHour,
          currentMinute,
        }),
      );

      const dueThreshold = new Date(today);
      dueThreshold.setDate(dueThreshold.getDate() + (s.days_before_due || 3));
      const dueThresholdStr = dueThreshold.toISOString().split("T")[0];

      // Lookback window for received/overdue (last N days based on frequency)
      const lookbackDays = s.frequency === "monthly" ? 30 : s.frequency === "weekly" ? 7 : 1;
      const lookback = new Date(today);
      lookback.setDate(lookback.getDate() - lookbackDays);
      const lookbackStr = lookback.toISOString().split("T")[0];

      let overdueExpenses: Row[] = [];
      let upcomingExpenses: Row[] = [];
      let pendingIncomes: Row[] = [];
      let receivedIncomes: Row[] = [];

      if (s.alert_overdue_expenses) {
        const { data } = await supabase
          .from("expenses")
          .select("id, description, amount, due_date")
          .eq("user_id", s.user_id)
          .eq("is_paid", false)
          .lt("due_date", todayStr)
          .order("due_date", { ascending: true });
        overdueExpenses = (data || []).map((r: any) => ({
          ...r,
          description: r.description || "(sem descrição)",
          date: r.due_date,
        }));
      }

      if (s.alert_upcoming_expenses) {
        const { data } = await supabase
          .from("expenses")
          .select("id, description, amount, due_date")
          .eq("user_id", s.user_id)
          .eq("is_paid", false)
          .gte("due_date", todayStr)
          .lte("due_date", dueThresholdStr)
          .order("due_date", { ascending: true });
        upcomingExpenses = (data || []).map((r: any) => ({
          ...r,
          description: r.description || "(sem descrição)",
          date: r.due_date,
        }));
      }

      if (s.alert_pending_incomes) {
        const { data } = await supabase
          .from("incomes")
          .select("id, title, description, amount, receive_date")
          .eq("user_id", s.user_id)
          .eq("is_received", false)
          .lte("receive_date", dueThresholdStr)
          .order("receive_date", { ascending: true });
        pendingIncomes = (data || []).map((r: any) => ({
          id: r.id,
          description: r.title || r.description || "(sem título)",
          amount: r.amount,
          date: r.receive_date,
        }));
      }

      if (s.alert_received_incomes) {
        const { data } = await supabase
          .from("incomes")
          .select("id, title, description, amount, receive_date")
          .eq("user_id", s.user_id)
          .eq("is_received", true)
          .gte("receive_date", lookbackStr)
          .lte("receive_date", todayStr)
          .order("receive_date", { ascending: false });
        receivedIncomes = (data || []).map((r: any) => ({
          id: r.id,
          description: r.title || r.description || "(sem título)",
          amount: r.amount,
          date: r.receive_date,
        }));
      }

      const totalItems =
        overdueExpenses.length +
        upcomingExpenses.length +
        pendingIncomes.length +
        receivedIncomes.length;

      if (totalItems === 0) continue;

      // Identify the source account (so when the same destination email is used
      // by multiple accounts, the recipient can clearly tell which one it refers to)
      let accountLabel = "";
      let accountEmail = "";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", s.user_id)
          .maybeSingle();
        accountEmail = (profile as any)?.email || "";
        accountLabel = (profile as any)?.full_name || accountEmail || s.user_id;
      } catch (_e) {
        accountLabel = s.user_id;
      }

      const accountBanner = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
          <p style="margin:0;font-size:13px;color:#1e3a8a;">
            <strong>Conta:</strong> ${accountLabel}${accountEmail && accountEmail !== accountLabel ? ` &lt;${accountEmail}&gt;` : ""}
          </p>
          <p style="margin:4px 0 0;font-size:12px;color:#475569;">
            Este resumo contém apenas dados desta conta. Se você usa o mesmo e-mail de destino em mais de uma conta, receberá um e-mail separado por conta.
          </p>
        </div>`;

      const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#111;">
        <h2 style="color:#2563eb;">Resumo financeiro MoneyGuia</h2>
        <p style="color:#475569;">Aqui está seu resumo de ${fmtDate(todayStr)}.</p>
        ${accountBanner}
        ${buildSection("⚠️ Despesas vencidas", "#dc2626", overdueExpenses)}
        ${buildSection("📅 Despesas a vencer", "#d97706", upcomingExpenses)}
        ${buildSection("💰 Receitas a receber", "#0891b2", pendingIncomes)}
        ${buildSection("✅ Receitas recebidas", "#16a34a", receivedIncomes)}
        <p style="margin-top:24px;color:#64748b;font-size:12px;">Você pode ajustar os tipos e a frequência destes alertas em Configurações → Notificações.</p>
      </body></html>`;

      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            to: s.notification_email,
            subject: `MoneyGuia [${accountLabel}]: ${totalItems} item(ns) financeiro(s)`,
            html,
          }),
        });

        if (emailResponse.ok) {
          totalEmailsSent++;
          if (!force) {
            await supabase
              .from("notification_settings")
              .update({ last_notification_date: todayStr })
              .eq("user_id", s.user_id);
          }
        } else {
          console.error("send-email-smtp failed:", await emailResponse.text());
        }
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Check completed",
        processed: allSettings?.length || 0,
        emailsSent: totalEmailsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("check-due-expenses error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
