import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: boolean;
  notification_email: string | null;
  days_before_due: number;
  send_once_only: boolean;
  last_notification_date: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_method: string;
  category_id: string | null;
  user_id: string;
}

interface Category {
  id: string;
  name: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  account: "Conta Bancária",
  pix: "PIX",
  credit_card: "Cartão de Crédito",
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR");
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with email notifications enabled
    const { data: notificationSettings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("email_enabled", true);

    if (settingsError) {
      throw new Error(`Failed to fetch notification settings: ${settingsError.message}`);
    }

    if (!notificationSettings || notificationSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with email notifications enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    let totalEmailsSent = 0;
    const results: Array<{ userId: string; emailsSent: number; error?: string }> = [];

    for (const settings of notificationSettings as NotificationSettings[]) {
      // Skip if send_once_only is true and we already sent today
      if (settings.send_once_only && settings.last_notification_date === todayStr) {
        results.push({ userId: settings.user_id, emailsSent: 0 });
        continue;
      }

      // Skip if no email configured
      if (!settings.notification_email) {
        results.push({ userId: settings.user_id, emailsSent: 0, error: "No email configured" });
        continue;
      }

      // Calculate date range for alerts
      const alertDate = new Date(today);
      alertDate.setDate(alertDate.getDate() + settings.days_before_due);
      const alertDateStr = alertDate.toISOString().split("T")[0];

      // Get unpaid expenses within the alert window
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("id, description, amount, due_date, payment_method, category_id, user_id")
        .eq("user_id", settings.user_id)
        .eq("is_paid", false)
        .lte("due_date", alertDateStr)
        .gte("due_date", todayStr)
        .order("due_date", { ascending: true });

      if (expensesError) {
        results.push({ userId: settings.user_id, emailsSent: 0, error: expensesError.message });
        continue;
      }

      if (!expenses || expenses.length === 0) {
        results.push({ userId: settings.user_id, emailsSent: 0 });
        continue;
      }

      // Get categories for the expenses
      const categoryIds = [...new Set(expenses.map((e) => e.category_id).filter(Boolean))];
      let categoriesMap: Record<string, string> = {};

      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from("categories")
          .select("id, name")
          .in("id", categoryIds);

        if (categories) {
          categoriesMap = Object.fromEntries(categories.map((c: Category) => [c.id, c.name]));
        }
      }

      // Build expense list HTML
      const expenseListHtml = expenses
        .map((expense: Expense) => {
          const categoryName = expense.category_id ? categoriesMap[expense.category_id] || "Sem categoria" : "Sem categoria";
          const paymentLabel = PAYMENT_METHOD_LABELS[expense.payment_method] || expense.payment_method;

          return `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${expense.description}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${categoryName}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${formatCurrency(expense.amount)}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${paymentLabel}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(expense.due_date)}</td>
            </tr>
          `;
        })
        .join("");

      const totalAmount = expenses.reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">⚠️ Lembrete de Vencimento</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="margin-top: 0;">Olá!</p>
            <p>Esta é uma notificação do seu <strong>Controle Financeiro</strong>. As seguintes despesas estão próximas do vencimento:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Despesa</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Categoria</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Valor</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Pagamento</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                ${expenseListHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f3f4f6;">
                  <td colspan="2" style="padding: 12px; font-weight: bold;">Total</td>
                  <td colspan="3" style="padding: 12px; font-weight: bold; color: #dc2626;">${formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            
            <p style="color: #6b7280; font-size: 14px;">
              Por favor, ignore este e-mail caso o pagamento já tenha sido processado.
            </p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>Este é um e-mail automático enviado pelo seu sistema de Controle Financeiro.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Controle Financeiro <onboarding@resend.dev>",
          to: [settings.notification_email],
          subject: `⚠️ Lembrete de Vencimento: ${expenses.length} despesa(s) próxima(s) do vencimento`,
          html: emailHtml,
        });

        console.log(`Email sent to ${settings.notification_email}:`, emailResponse);

        // Update last notification date
        await supabase
          .from("notification_settings")
          .update({ last_notification_date: todayStr })
          .eq("id", settings.id);

        totalEmailsSent++;
        results.push({ userId: settings.user_id, emailsSent: 1 });
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`Failed to send email to ${settings.notification_email}:`, emailError);
        results.push({ userId: settings.user_id, emailsSent: 0, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEmailsSent,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-due-expenses:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
