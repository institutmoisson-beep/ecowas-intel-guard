import { createFileRoute } from "@tanstack/react-router";
import { guardBotRequest, json } from "@/lib/api-guard.server";

const KEYWORDS = [
  "Ignite",
  "Sylla issouf",
  "Sylla zoumana",
  "ngolo",
  "la flamme",
  "UfG-groupe",
  "ancien Qnet",
  "Qnet",
  "marketing de réseau",
  "MLM",
  "bureau Ignite",
  "Côte d'Ivoire Ignite",
  "diffamation",
  "arnaque",
  "usurpation",
  "faux compte",
];

export const Route = createFileRoute("/api/public/bot-keywords")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = guardBotRequest(request, "bot-keywords", { limit: 60, windowMs: 60_000 });
        if (denied) return denied;
        return json({ keywords: KEYWORDS });
      },
    },
  },
});
