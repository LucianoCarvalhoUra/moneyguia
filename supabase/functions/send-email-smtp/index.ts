declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: EmailRequest = await req.json();
    if (!body.to || !body.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasExpensesTemplate = Array.isArray(body.expenses) && body.expenses.length > 0;
    const formatCurrency = (value: number): string =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    const formatDate = (dateStr: string): string =>
      new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");

    const expenseListHtml = hasExpensesTemplate
      ? body.expenses!
          .map(
            (expense) =>
              `<tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.description}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatCurrency(expense.amount)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(expense.due_date)}</td>
              </tr>`,
          )
          .join("")
      : "";

    const totalAmount = hasExpensesTemplate
      ? body.expenses!.reduce((sum, exp) => sum + exp.amount, 0)
      : 0;

    const expensesHtml = hasExpensesTemplate
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lembrete de Despesas</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Lembrete de Despesas</h2>
          <p>Voce tem <strong>${body.expenses!.length}</strong> despesa(s) proxima(s) do vencimento:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Descricao</th>
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Valor</th>
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              ${expenseListHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="padding: 12px 8px; border-top: 2px solid #e5e7eb;">Total</td>
                <td colspan="2" style="padding: 12px 8px; border-top: 2px solid #e5e7eb;">${formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `
      : undefined;

    const html = body.html || expensesHtml;
    const text = body.text;
    if (!html && !text) {
      return new Response(
        JSON.stringify({ error: "Missing content. Provide html/text or expenses." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "KeepMoney Control <onboarding@resend.dev>",
        to: [body.to],
        subject: body.subject,
        html,
        text,
      }),
    });

    const responseText = await resendResponse.text();
    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResponse.status, responseText);
      return new Response(
        JSON.stringify({ error: "Failed to send email via Resend", details: responseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider: "resend", details: responseText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error in send-email-smtp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
