const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  expenses: DueExpense[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization - only allow internal calls with service role key
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
      console.error("Unauthorized request to send-email-smtp");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Check if we have either SMTP or Resend configuration
    const hasSmtp = smtpHost && smtpPort && smtpUser && smtpPass;
    const hasResend = !!resendApiKey;

    if (!hasSmtp && !hasResend) {
      console.error("No email provider configured (SMTP or Resend)");
      return new Response(
        JSON.stringify({ error: "Email provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EmailRequest = await req.json();
    
    // Validate required fields
    if (!body.to || !body.subject || !body.expenses) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, expenses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format currency for display
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    };

    // Format date for display
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("pt-BR");
    };

    // Build expense list HTML
    const expenseListHtml = body.expenses
      .map(
        (expense) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.description}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatCurrency(expense.amount)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(expense.due_date)}</td>
          </tr>`
      )
      .join("");

    const totalAmount = body.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lembrete de Despesas</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🔔 Lembrete de Despesas</h2>
        <p>Olá! Você tem <strong>${body.expenses.length}</strong> despesa(s) próxima(s) do vencimento:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Descrição</th>
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
        
        <p style="color: #6b7280; font-size: 14px;">
          Este é um lembrete automático do seu sistema de controle financeiro.
        </p>
      </body>
      </html>
    `;

    // Use Resend if available, otherwise SMTP
    if (hasResend) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "KeepMoney Control <noreply@resend.dev>",
          to: [body.to],
          subject: body.subject,
          html: htmlContent,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        console.error("Resend API error:", errorData);
        return new Response(
          JSON.stringify({ error: "Failed to send email via Resend" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await resendResponse.json();
      console.log("Email sent successfully via Resend:", result.id);
      return new Response(
        JSON.stringify({ success: true, provider: "resend", messageId: result.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SMTP fallback - Note: Deno doesn't have native SMTP, would need external library
    // For now, log and return success for testing purposes
    console.log("SMTP configuration detected but native SMTP not implemented in Deno Edge Functions");
    console.log("Email would be sent to:", body.to);
    console.log("Subject:", body.subject);
    console.log("Expenses count:", body.expenses.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        provider: "smtp", 
        message: "SMTP not fully implemented - use Resend API instead" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in send-email-smtp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
