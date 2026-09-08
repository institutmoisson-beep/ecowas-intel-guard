import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Déclencheur externe (cron / bot HTML) du moteur de veille ISIS. */
export const Route = createFileRoute("/api/public/bot-run")({
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

        let body: { keywords?: string[]; limit?: number } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }

        const { runBotScan } = await import("@/lib/bot-scan.server");
        const result = await runBotScan({
          keywords: Array.isArray(body.keywords) ? body.keywords.slice(0, 20) : undefined,
          limit: typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 16) : undefined,
        });
        return json(result, result.ok ? 200 : 207);
      },
    },
  },
});
