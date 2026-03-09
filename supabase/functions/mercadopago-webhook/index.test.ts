import { describe, it, expect } from "vitest";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`;

describe("Mercado Pago Webhook", () => {
  it("CORS preflight returns 200", async () => {
    const res = await fetch(WEBHOOK_URL, { method: "OPTIONS" });
    await res.text();
    expect(res.status).toBe(200);
  });

  it("Non-payment notification returns ok", async () => {
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
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("Missing payment ID returns 400", async () => {
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
    expect(res.status).toBe(400);
    expect(data.error).toBe("No payment ID");
  });

  it("Fake payment ID does not crash webhook", async () => {
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
    expect(res.status).toBe(200);
  });
});
