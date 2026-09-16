import { supabase } from "@/integrations/supabase/client";

/** Journalisation d'activité des opérateurs (côté client, table user_activity). */

const SESSION_KEY = "isis-session-id";
const GEO_KEY = "isis-geo";

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type Geo = { latitude: number; longitude: number; accuracy: number };

function cachedGeo(): Geo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GEO_KEY);
    return raw ? (JSON.parse(raw) as Geo) : null;
  } catch {
    return null;
  }
}

/** Demande la position (une fois par session, uniquement si l'utilisateur accepte). */
export function requestGeolocation(): void {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return;
  if (cachedGeo()) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const geo: Geo = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
    },
    () => undefined,
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
  );
}

function deviceInfo() {
  if (typeof window === "undefined") return {};
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
    userAgentData?: { platform?: string; mobile?: boolean };
  };
  return {
    user_agent: nav.userAgent,
    platform: nav.userAgentData?.platform ?? nav.platform ?? null,
    language: nav.language ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`,
    device_memory: nav.deviceMemory ?? null,
    cpu_cores: nav.hardwareConcurrency ?? null,
    network: nav.connection?.effectiveType ?? null,
    details: {
      mobile: nav.userAgentData?.mobile ?? /Mobi|Android/i.test(nav.userAgent),
      referrer: document.referrer || null,
      online: nav.onLine,
    },
  };
}

/** Enregistre un évènement (connexion, page, action). Silencieux en cas d'échec. */
export async function logActivity(
  event: string,
  path?: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const base = deviceInfo();
    const geo = cachedGeo();
    await supabase.from("user_activity").insert({
      user_id: user.id,
      email: user.email ?? null,
      event,
      path: path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      session_id: sessionId(),
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      accuracy: geo?.accuracy ?? null,
      ...base,
      details: { ...(base.details ?? {}), ...extra },
    });
  } catch {
    /* journalisation best-effort */
  }
}
