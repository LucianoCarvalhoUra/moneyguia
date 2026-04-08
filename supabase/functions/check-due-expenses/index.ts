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
}

interface DueExpense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  user_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with notifications enabled
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
      ("No users with notifications enabled");
      return new Response(
        JSON.stringify({ message: "No users with notifications enabled", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    let totalEmailsSent = 0;

    for (const settings of notificationSettings as NotificationSettings[]) {
      // Skip if send_once_only and already sent today
      if (settings.send_once_only && settings.last_notification_date === todayStr) {
        (`Skipping user ${settings.user_id} - already notified today`);
        continue;
      }

      // Skip if no notification email configured
      if (!settings.notification_email) {
        (`Skipping user ${settings.user_id} - no email configured`);
        continue;
      }

      // Calculate the due date threshold
      const dueThreshold = new Date(today);
      dueThreshold.setDate(dueThreshold.getDate() + settings.days_before_due);
      const dueThresholdStr = dueThreshold.toISOString().split("T")[0];

      // Get unpaid expenses due within the threshold
      const { data: dueExpenses, error: expensesError } = await supabase
        .from("expenses")
        .select("id, description, amount, due_date, user_id")
        .eq("user_id", settings.user_id)
        .eq("is_paid", false)
        .lte("due_date", dueThresholdStr)
        .gte("due_date", todayStr);

      if (expensesError) {
        console.error(`Error fetching expenses for user ${settings.user_id}:`, expensesError.message);
        continue;
      }

      if (!dueExpenses || dueExpenses.length === 0) {
        (`No due expenses for user ${settings.user_id}`);
        continue;
      }

      // Send email notification via send-email-smtp function
      try {
        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-email-smtp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              to: settings.notification_email,
              subject: `Lembrete: ${dueExpenses.length} despesa(s) próxima(s) do vencimento`,
              expenses: dueExpenses,
            }),
          }
        );

        if (emailResponse.ok) {
          totalEmailsSent++;
          (`Email sent to ${settings.notification_email}`);

          // Update last notification date
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

    (`Check-due-expenses completed. Emails sent: ${totalEmailsSent}`);
    return new Response(
      JSON.stringify({ 
        message: "Check completed successfully", 
        processed: notificationSettings.length,
        emailsSent: totalEmailsSent 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in check-due-expenses:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
