import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`;

// Test 1: OPTIONS preflight should return 200
Deno.test("CORS preflight returns 200", async () => {
  const res = await fetch(WEBHOOK_URL, { method: "OPTIONS" });
  const body = await res.text();
  assertEquals(res.status, 200);
  console.log("✅ CORS preflight OK");
});

// Test 2: Non-payment notification type should be accepted gracefully
Deno.test("Non-payment notification returns ok", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "test",
      action: "test.created",
      data: { id: "123" },
    }),
  });
  const data = await res.json();
  assertEquals(res.status, 200);
  assertEquals(data.ok, true);
  console.log("✅ Non-payment notification handled correctly");
});

// Test 3: Payment notification without data.id should return 400
Deno.test("Missing payment ID returns 400", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "payment",
      action: "payment.updated",
      data: {},
    }),
  });
  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "No payment ID");
  console.log("✅ Missing payment ID handled correctly");
});

// Test 4: Payment notification with fake ID (MP API will return error, but webhook should not crash)
Deno.test("Fake payment ID does not crash webhook", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "payment",
      action: "payment.updated",
      data: { id: "999999999" },
    }),
  });
  const data = await res.json();
  // Should return 200 (ok) even if payment not found in our DB
  assertEquals(res.status, 200);
  console.log("✅ Fake payment ID handled gracefully, response:", JSON.stringify(data));
});
