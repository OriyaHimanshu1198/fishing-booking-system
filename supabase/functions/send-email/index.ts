import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const BREVO_KEY = Deno.env.get("BREVO_API_KEY") || "";
const SENDER = Deno.env.get("BREVO_SENDER_EMAIL") || "bookings@yourdomain.com";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = await req.json();
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        sender: { name: "Fishing Booking System", email: SENDER },
        to: [{ email: body.email, name: body.name }],
        subject: body.subject || `🎣 Fishing Booking Confirmed - Week ${body.week}`,
        htmlContent: body.html || "Your booking is confirmed.",
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ success: res.ok, messageId: data.messageId || null }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
