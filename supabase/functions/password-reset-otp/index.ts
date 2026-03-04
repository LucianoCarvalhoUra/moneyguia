import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "request_code" | "verify_code" | "update_password";

interface OtpRequestBody {
  action: Action;
  email?: string;
  code?: string;
  newPassword?: string;
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const isCode = (value: string) => /^[0-9]{6}$/.test(value);
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json()) as OtpRequestBody;
    const action = body.action;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "request_code") {
      const email = normalizeEmail(body.email || "");
      if (!isEmail(email)) {
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Cleanup expired codes before processing.
      await admin.from("password_reset_codes").delete().lt("expires_at", new Date().toISOString());

      // Basic anti-abuse: max 3 attempts in 15 minutes for same e-mail.
      const { count: attemptsCount } = await admin
        .from("password_reset_codes")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

      if ((attemptsCount || 0) >= 3) {
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Only generate code for existing users but always return success (no user enumeration).
      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (!profile?.user_id) {
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error: insertError } = await admin
        .from("password_reset_codes")
        .insert({ email, code, expires_at: expiresAt });

      if (insertError) {
        console.error("Failed to create password reset code:", insertError.message);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create reset code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (resendApiKey) {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "KeepMoney Control <noreply@resend.dev>",
            to: [email],
            subject: "Codigo de recuperacao de senha",
            // Requirement: only the numeric code in e-mail body.
            text: code,
            html: `<p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p>`,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          console.error("Resend error:", errorText);
        }
      } else {
        // Fallback for environments without email provider configured.
        console.log(`[password-reset-otp] Simulated e-mail to ${email} with code ${code}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify_code") {
      const email = normalizeEmail(body.email || "");
      const code = (body.code || "").trim();

      if (!isEmail(email) || !isCode(code)) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data, error } = await admin
        .from("password_reset_codes")
        .select("id")
        .eq("email", email)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Code verification error:", error.message);
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ valid: !!data?.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "update_password") {
      const email = normalizeEmail(body.email || "");
      const code = (body.code || "").trim();
      const newPassword = body.newPassword || "";

      if (!isEmail(email) || !isCode(code) || newPassword.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: "Dados invalidos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: codeRows, error: codeError } = await admin
        .from("password_reset_codes")
        .select("id")
        .eq("email", email)
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (codeError || !codeRows?.length) {
        return new Response(
          JSON.stringify({ success: false, error: "Codigo invalido ou expirado." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (!profile?.user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Usuario nao encontrado." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(profile.user_id, {
        password: newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError.message);
        return new Response(
          JSON.stringify({ success: false, error: "Falha ao atualizar senha." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Security: delete all codes for this email after successful password update.
      await admin.from("password_reset_codes").delete().eq("email", email);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unsupported action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected password-reset-otp error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
