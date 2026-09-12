import { createFileRoute } from "@tanstack/react-router";
import { guardBotRequest, json } from "@/lib/api-guard.server";

/** Déclencheur externe (cron / bot HTML) du moteur de veille ISIS. */
export const Route = createFileRoute("/api/public/bot-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = guardBotRequest(request, "bot-run", { limit: 6, windowMs: 60_000 });
        if (denied) return denied;

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
