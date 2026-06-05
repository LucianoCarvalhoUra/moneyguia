import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DueExpense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  expenses?: DueExpense[];
  html?: string;
  text?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;

    if (!smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "SMTP credentials not configured (SMTP_USER, SMTP_PASSWORD)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EmailRequest = await req.json();
    if (!body.to || !body.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasExpenses = Array.isArray(body.expenses) && body.expenses.length > 0;
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    const formatDate = (dateStr: string) =>
      new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");

    const expenseRowsHtml = hasExpenses
      ? body.expenses!.map((e) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${e.description}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${formatCurrency(e.amount)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">${formatDate(e.due_date)}</td>
          </tr>`).join("")
      : "";

    const totalAmount = hasExpenses
      ? body.expenses!.reduce((s, e) => s + e.amount, 0)
      : 0;

    const expensesHtml = hasExpenses ? `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#2563eb;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">MoneyGuia — Lembrete de Despesas</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p>Você tem <strong>${body.expenses!.length}</strong> despesa(s) próxima(s) do vencimento:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:12px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Descrição</th>
                <th style="padding:12px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Valor</th>
                <th style="padding:12px 8px;text-align:left;border-bottom:2px solid #e5e7eb">Vencimento</th>
              </tr>
            </thead>
            <tbody>${expenseRowsHtml}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6;font-weight:bold">
                <td style="padding:12px 8px;border-top:2px solid #e5e7eb">Total</td>
                <td colspan="2" style="padding:12px 8px;border-top:2px solid #e5e7eb">${formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
          <p style="color:#6b7280;font-size:12px">Acesse o MoneyGuia para gerenciar suas finanças.</p>
        </div>
      </body>
      </html>` : undefined;

    const html = body.html || expensesHtml;
    if (!html && !body.text) {
      return new Response(
        JSON.stringify({ error: "Missing content: provide html, text or expenses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPassword },
      },
    });

    await client.send({
      from: `MoneyGuia <${smtpFrom}>`,
      to: body.to,
      subject: body.subject,
      html: html ?? undefined,
      content: body.text ?? "alt",
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, provider: "smtp", sentTo: body.to }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-email-smtp error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
