import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const alertSchema = z.object({
  platform: z.string().min(1).max(120),
  keyword_triggered: z.string().min(1).max(200),
  target_name: z.string().max(500).nullish(),
  content_snippet: z.string().max(5000).nullish(),
  content_url: z.string().max(2000).nullish(),
  severity: z
    .string()
    .transform((s) => s.toUpperCase())
    .refine((s) => ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s), "severity invalide")
    .default("MEDIUM"),
  ai_analysis: z.string().max(2000).nullish(),
  status: z.string().max(40).default("PENDING"),
  country: z.string().max(80).nullish(),
  source: z.string().max(80).default("bot"),
  detected_at: z.string().datetime({ offset: true }).optional(),
});

const payloadSchema = z.union([alertSchema, z.array(alertSchema).max(100)]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/bot-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["BOT_INGEST_TOKEN"];
        if (!token) return json({ error: "ingest not configured" }, 500);

        const provided =
          request.headers.get("x-bot-token") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (provided !== token) return json({ error: "unauthorized" }, 401);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "invalid json" }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "invalid payload", details: parsed.error.issues }, 422);
        }

        const rows = (Array.isArray(parsed.data) ? parsed.data : [parsed.data]).map((a) => ({
          platform: a.platform,
          keyword_triggered: a.keyword_triggered,
          target_name: a.target_name ?? null,
          content_snippet: a.content_snippet ?? null,
          content_url: a.content_url ?? null,
          severity: a.severity,
          ai_analysis: a.ai_analysis ?? null,
          status: a.status,
          country: a.country ?? null,
          source: a.source,
          detected_at: a.detected_at ?? new Date().toISOString(),
        }));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("alerts")
          .upsert(rows, { onConflict: "content_url,keyword_triggered", ignoreDuplicates: true })
          .select("id");

        if (error) {
          console.error("bot-ingest insert failed", error);
          return json({ error: error.message }, 500);
        }

        return json({ ok: true, received: rows.length, inserted: data?.length ?? 0 });
      },
    },
  },
});
