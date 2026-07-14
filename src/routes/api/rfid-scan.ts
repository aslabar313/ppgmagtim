import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Fetch env variables
const SUPABASE_URL = 
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || 
  process.env.SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  "https://lwtlxbtjngqtinzuyuiz.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = 
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) || 
  process.env.SUPABASE_PUBLISHABLE_KEY || 
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  "sb_publishable_xtp6n4jLb55cJ16MjZXGug_VWRx1yA5";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RFID_SECRET_TOKEN = process.env.RFID_SECRET_TOKEN || "PintarYukRFIDToken2026";

export const Route = createFileRoute("/api/rfid-scan")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            status: "active",
            message: "PintarYuk Standalone RFID API is online. Send POST requests to check-in.",
            instructions: {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: { uid: "RFID_CARD_UID", token: "RFID_SECRET_TOKEN" }
            }
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { uid: string; token?: string };
          const { uid, token } = body;

          console.log("Processing RFID scan for UID:", uid);

          if (!uid) {
            return new Response(JSON.stringify({ success: false, error: "UID is required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          // Check token to secure the endpoint (if token is set)
          if (RFID_SECRET_TOKEN && token !== RFID_SECRET_TOKEN) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized: Invalid RFID token" }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          // Initialize server-side Supabase client to broadcast
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return new Response(JSON.stringify({ success: false, error: "Supabase configuration missing on server" }), {
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          const tokenToUse = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;
          const broadcastUrl = `${SUPABASE_URL}/realtime/v1/api/broadcast`;
          console.log("Broadcasting scan via REST:", broadcastUrl);

          const response = await fetch(broadcastUrl, {
            method: "POST",
            headers: {
              "apikey": tokenToUse,
              "Authorization": `Bearer ${tokenToUse}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messages: [
                {
                  topic: "rfid-scans",
                  event: "scan",
                  payload: { uid }
                },
                {
                  topic: "realtime:rfid-scans",
                  event: "scan",
                  payload: { uid }
                },
                {
                  topic: "rfid-scans-siswa",
                  event: "scan",
                  payload: { uid }
                },
                {
                  topic: "realtime:rfid-scans-siswa",
                  event: "scan",
                  payload: { uid }
                },
                {
                  topic: "rfid-scans-quick",
                  event: "scan",
                  payload: { uid }
                },
                {
                  topic: "realtime:rfid-scans-quick",
                  event: "scan",
                  payload: { uid }
                }
              ]
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Supabase REST broadcast failed with status ${response.status}: ${errText}`);
          }

          console.log("REST broadcast request succeeded with status:", response.status);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Scan event for UID '${uid}' broadcasted successfully` 
            }), 
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        } catch (err: any) {
          console.error("RFID Scan API Error:", err);
          return new Response(JSON.stringify({ success: false, error: err.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
  }
});
