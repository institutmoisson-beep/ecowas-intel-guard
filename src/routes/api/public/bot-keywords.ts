import { createFileRoute } from "@tanstack/react-router";

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
        const token = process.env["BOT_INGEST_TOKEN"];
        const provided =
          request.headers.get("x-bot-token") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!token || provided !== token) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }
        return new Response(JSON.stringify({ keywords: KEYWORDS }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});
