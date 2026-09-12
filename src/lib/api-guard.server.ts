/** Garde de sécurité pour les endpoints publics ISIS (token + limitation de débit). */

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

/** Comparaison à temps constant (évite les attaques temporelles sur le token). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Limitation de débit best-effort par IP + route. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Vérifie le token de bot et applique la limitation de débit.
 * Retourne une Response en cas de refus, sinon null.
 */
export function guardBotRequest(
  request: Request,
  route: string,
  options: { limit?: number; windowMs?: number } = {},
): Response | null {
  const ip = clientIp(request);
  const gate = rateLimit(`${route}:${ip}`, options.limit ?? 30, options.windowMs ?? 60_000);
  if (!gate.ok) {
    return json({ error: "too many requests" }, 429, { "retry-after": String(gate.retryAfter) });
  }

  const token = process.env["BOT_INGEST_TOKEN"];
  if (!token) return json({ error: "ingest not configured" }, 500);

  const provided =
    request.headers.get("x-bot-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!provided || !safeEqual(provided, token)) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
