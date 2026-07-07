// deno-lint-ignore-file no-explicit-any
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
  fromName?: string;
}

const FROM_NAME_DEFAULT = "AlertaMoneyGuia";

function buildExpensesHtml(expenses: DueExpense[]): string {
  const fmtMoney = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fmtDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const rows = expenses
    .map(
      (e) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${e.description}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${fmtMoney(e.amount)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${fmtDate(e.due_date)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Lembrete de Despesas</title></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#2563eb;">Lembrete de Despesas</h2>
  <p>Voc&ecirc; tem <strong>${expenses.length}</strong> despesa(s) pr&oacute;xima(s) do vencimento:</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <thead><tr style="background:#f3f4f6;">
      <th style="padding:12px 8px;text-align:left;border-bottom:2px solid #e5e7eb;">Descri&ccedil;&atilde;o</th>
      <th style="padding:12px 8px;text-align:left;border-bottom:2px solid #e5e7eb;">Valor</th>
      <th style="padding:12px 8px;text-align:left;border-bottom:2px solid #e5e7eb;">Vencimento</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#f3f4f6;font-weight:bold;">
      <td style="padding:12px 8px;border-top:2px solid #e5e7eb;">Total</td>
      <td colspan="2" style="padding:12px 8px;border-top:2px solid #e5e7eb;">${fmtMoney(total)}</td>
    </tr></tfoot>
  </table>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: EmailRequest = await req.json();
    if (!body.to || !body.subject) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html =
      body.html ||
      (Array.isArray(body.expenses) && body.expenses.length > 0
        ? buildExpensesHtml(body.expenses)
        : undefined);

    if (!html && !body.text) {
      return new Response(
        JSON.stringify({ error: "Missing content: provide html, text or expenses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromName = body.fromName || FROM_NAME_DEFAULT;
    const tls = SMTP_PORT === 465;

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls,
        auth: { username: SMTP_USER, password: SMTP_PASSWORD },
      },
    });

    // Collapse newlines to avoid quoted-printable soft-breaks (=20) appearing in clients
    const htmlOneLine = html ? html.replace(/\r?\n+/g, " ").replace(/\s{2,}/g, " ") : undefined;

    try {
      await client.send({
        from: `${fromName} <${SMTP_FROM}>`,
        to: body.to,
        subject: body.subject,
        content: body.text || "Veja a versao HTML deste e-mail.",
        html: htmlOneLine,
      });
    } finally {
      try {
        await client.close();
      } catch (_e) {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({ success: true, provider: "smtp", host: SMTP_HOST }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-email-smtp error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: String((error as any)?.message || error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
