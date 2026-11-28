// FR-05 – PayOS Webhook Edge Function
// Handles instant payment notifications from PayOS / VietQR Open Banking.
// Updates transaction, upgrades membership or print order status, and pushes notification.
//
// POST /functions/v1/payos-webhook
//   body: PayOS Webhook payload

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await request.json();
    console.log("PayOS Webhook received:", JSON.stringify(payload));

    const data = payload?.data || payload;
    const orderCode = data?.orderCode;

    if (!orderCode) {
      return new Response(JSON.stringify({ error: "Missing orderCode in webhook payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Call idempotent RPC function to complete the transaction and apply business logic
    const { data: rpcResult, error: rpcError } = await admin.rpc("complete_payment_transaction", {
      p_order_code: Number(orderCode),
      p_gateway_ref: data?.reference || "PAYOS_WEBHOOK",
      p_metadata: {
        payos_data: data,
        webhook_received_at: new Date().toISOString(),
      },
    });

    if (rpcError) {
      console.error("RPC complete_payment_transaction error:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("PayOS transaction processed successfully:", rpcResult);

    return new Response(JSON.stringify({ success: true, result: rpcResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

