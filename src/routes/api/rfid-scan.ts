import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Fetch env variables
const SUPABASE_URL = process.env.SUPABASE_URL || "https://lwtlxbtjngqtinzuyuiz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_xtp6n4jLb55cJ16MjZXGug_VWRx1yA5";
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

          const serverSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

          // We send the broadcast to the "rfid-scans" channel
          const channel = serverSupabase.channel("rfid-scans");
          
          const sendPromise = new Promise<void>((resolve, reject) => {
            channel.subscribe(async (status) => {
              if (status === "SUBSCRIBED") {
                try {
                  await channel.send({
                    type: "broadcast",
                    event: "scan",
                    payload: { uid }
                  });
                  // Give it a tiny moment to flush the websocket frame
                  setTimeout(() => {
                    serverSupabase.removeChannel(channel);
                    resolve();
                  }, 200);
                } catch (err) {
                  reject(err);
                }
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                reject(new Error("Failed to subscribe to Supabase Realtime channel"));
              }
            });
          });

          await sendPromise;

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
