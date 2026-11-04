// ============================================================================
// SERVER API ROUTE: /api/festival-sync
// LAYER 2 SECURITY: Server-Side Authorization & Anti-Spoofing Guard
// ============================================================================

import { createFileRoute } from "@tanstack/react-router";
import {
  canAccessFestivalOrg,
  canJudgeAccessCompetition,
  resolveCanonicalFestivalActor,
} from "@/lib/festival/festivalAuth";
import {
  createCompetitionRegistration,
  enrollParticipantFromGenerus,
  getFestivalStore,
  getScopedCompetitions,
  getScopedContingents,
  getScopedParticipants,
  getScopedRegistrations,
  submitJudgeScore,
} from "@/lib/festival/festivalService";

export const Route = createFileRoute("/api/festival-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const username = url.searchParams.get("username") || "";
          const requestedRegion = url.searchParams.get("region_id") || undefined;
          const requestedVillage = url.searchParams.get("village_id") || undefined;
          const requestedGroup = url.searchParams.get("group_id") || undefined;
          const requestedCompetition = url.searchParams.get("competition_id") || undefined;

          if (!username) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Unauthorized (401): Parameter identitas pengguna wajib disertakan.",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          // Resolve canonical identity on the server (never trust client-sent role/scope)
          let actor;
          try {
            actor = resolveCanonicalFestivalActor(username);
          } catch (err) {
            return new Response(
              JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : "Unauthorized",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          // Validate organizational scope access on server
          const orgCheck = canAccessFestivalOrg(
            actor,
            requestedRegion,
            requestedVillage,
            requestedGroup
          );
          if (!orgCheck.allowed) {
            return new Response(
              JSON.stringify({
                success: false,
                error: orgCheck.reason || "Forbidden (403): Cross-scope access denied.",
              }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }

          const store = getFestivalStore();

          if (actor.role === "Juri" && requestedCompetition) {
            const allowedJudge = canJudgeAccessCompetition(
              actor,
              requestedCompetition,
              store.judgeAssignments,
              store.judges
            );
            if (!allowedJudge) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: `Forbidden (403): Juri '${actor.username}' tidak ditugaskan pada lomba '${requestedCompetition}'.`,
                }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              actor: {
                username: actor.username,
                role: actor.role,
                regionName: actor.regionName,
                villageName: actor.villageName,
                groupName: actor.groupName,
              },
              data: {
                events: store.events,
                stages: store.stages,
                categories: store.categories,
                arenas: store.arenas,
                competitions: getScopedCompetitions(actor),
                contingents: getScopedContingents(
                  actor,
                  requestedRegion,
                  requestedVillage,
                  requestedGroup
                ),
                participants: getScopedParticipants(
                  actor,
                  requestedRegion,
                  requestedVillage,
                  requestedGroup
                ),
                registrations: getScopedRegistrations(actor, {
                  competitionId: requestedCompetition,
                  regionName: requestedRegion,
                  villageName: requestedVillage,
                  groupName: requestedGroup,
                }),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Internal Server Error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            username?: string;
            action?: string;
            payload?: Record<string, unknown>;
          };

          if (!body.username) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Unauthorized (401): Identitas pengguna wajib diverifikasi server.",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          let actor;
          try {
            actor = resolveCanonicalFestivalActor(body.username);
          } catch (err) {
            return new Response(
              JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : "Unauthorized",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          const payload = body.payload || {};

          if (body.action === "ENROLL_PARTICIPANT") {
            const participant = enrollParticipantFromGenerus(
              actor,
              String(payload.generusId || ""),
              payload.targetGroup ? String(payload.targetGroup) : undefined
            );
            return new Response(JSON.stringify({ success: true, data: participant }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (body.action === "CREATE_REGISTRATION") {
            const registration = createCompetitionRegistration(actor, {
              competitionId: String(payload.competitionId || ""),
              participantId: payload.participantId ? String(payload.participantId) : null,
              teamId: payload.teamId ? String(payload.teamId) : null,
            });
            return new Response(JSON.stringify({ success: true, data: registration }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (body.action === "SUBMIT_SCORE") {
            const result = submitJudgeScore(actor, {
              registrationId: String(payload.registrationId || ""),
              stageId: String(payload.stageId || "stg-penyisihan"),
              judgePosition: (Number(payload.judgePosition) || 1) as 1 | 2 | 3,
              rawScore: Number(payload.rawScore || 0),
              penaltyDeduction: Number(payload.penaltyDeduction || 0),
              judgeNotes: String(payload.judgeNotes || ""),
            });
            return new Response(JSON.stringify({ success: true, data: result }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({ success: false, error: "Action tidak dikenali." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Forbidden";
          const status = msg.includes("DENY") || msg.includes("Akses ditolak") ? 403 : 400;
          return new Response(JSON.stringify({ success: false, error: msg }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
