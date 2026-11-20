// FR-07 (T-07.05) – Supabase Edge Function to deliver FCM HTTP v1 Push Notifications.
// Triggered by a Supabase Database Webhook on INSERT into `public.notifications`.
// Required secret: FIREBASE_SERVICE_ACCOUNT_JSON (Firebase Admin service account JSON string).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: NotificationRecord;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getFirebaseAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsignedJwt = `${header}.${claimSet}`;
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );
  const jwt = `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`OAuth2 token request failed: ${await tokenRes.text()}`);
  }
  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as WebhookPayload;
    const record = payload.record;
    if (!record || !record.user_id) {
      return new Response(
        JSON.stringify({ error: "Missing notification record in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firebaseSaRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (!firebaseSaRaw) {
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          reason: "FIREBASE_SERVICE_ACCOUNT_JSON secret is not configured",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const serviceAccount = JSON.parse(firebaseSaRaw);
    const projectId = serviceAccount.project_id;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokens, error: tokenErr } = await supabase
      .from("device_tokens")
      .select("id, token")
      .eq("user_id", record.user_id);

    if (tokenErr) throw tokenErr;
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "No registered device tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    const invalidTokenIds: string[] = [];

    for (const row of tokens) {
      const fcmRes = await fetch(fcmEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: {
              title: record.title,
              body: record.body ?? "",
            },
            data: {
              notification_id: record.id,
              type: record.type,
              ...(record.data
                ? Object.fromEntries(
                    Object.entries(record.data).map(([k, v]) => [k, String(v)]),
                  )
                : {}),
            },
            android: {
              priority: "HIGH",
              notification: {
                channel_id: "pause_notifications",
              },
            },
          },
        }),
      });

      if (fcmRes.ok) {
        sent++;
      } else {
        const errBody = await fcmRes.text();
        console.warn(`FCM send failed for token ${row.id}:`, errBody);
        if (errBody.includes("UNREGISTERED") || errBody.includes("INVALID_ARGUMENT")) {
          invalidTokenIds.push(row.id);
        }
      }
    }

    if (invalidTokenIds.length > 0) {
      await supabase.from("device_tokens").delete().in("id", invalidTokenIds);
    }

    return new Response(
      JSON.stringify({ ok: true, sent, cleaned: invalidTokenIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in send-notification:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
