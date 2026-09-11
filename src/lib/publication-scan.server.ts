/**
 * Scanner de publication ISIS (serveur uniquement).
 * 1) Récupération du contenu public de la publication (HTML + oEmbed quand disponible).
 * 2) Double analyse IA : Google Gemini (Google AI Studio) + un second modèle indépendant.
 * 3) Résumé, passages diffamatoires, informations extraites, gravité.
 */

export const NETWORKS = [
  "TikTok",
  "Facebook",
  "WhatsApp",
  "YouTube",
  "Instagram",
  "X / Twitter",
  "Autre",
] as const;
export type Network = (typeof NETWORKS)[number];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PRIMARY_MODEL = "google/gemini-2.5-flash";
export const SECONDARY_MODEL = "openai/gpt-5.6-sol";

export type Analysis = {
  summary: string;
  defamatory_excerpts: { excerpt: string; reason: string }[];
  extracted_info: Record<string, unknown>;
  severity: Severity;
  author_handle: string | null;
  analysis: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function oembed(url: string): Promise<string> {
  const endpoints: Record<string, string> = {
    "tiktok.com": `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    "youtube.com": `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    "youtu.be": `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  };
  const key = Object.keys(endpoints).find((k) => url.includes(k));
  if (!key) return "";
  try {
    const res = await fetch(endpoints[key]!);
    if (!res.ok) return "";
    const data = (await res.json()) as Record<string, unknown>;
    return Object.entries(data)
      .filter(([, v]) => typeof v === "string" && (v as string).length < 2000)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join("\n");
  } catch {
    return "";
  }
}

export async function fetchPublication(
  url: string,
): Promise<{ text: string; notes: string[]; mediaUrl: string | null }> {
  const notes: string[] = [];
  let text = "";
  let mediaUrl: string | null = null;
  const meta = await oembed(url);
  if (meta) {
    text += `${meta}\n`;
    notes.push("Métadonnées oEmbed récupérées.");
  }
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ISIS-Scanner/1.0; +https://ecowas-intel-guard.lovable.app)",
        "accept-language": "fr,en;q=0.8",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const ogs = [...html.matchAll(/<meta[^>]+(?:property|name)="([^"]+)"[^>]+content="([^"]*)"/gi)]
        .filter(([, p]) => /og:|description|title|author/i.test(p ?? ""))
        .map(([, p, c]) => `${p}: ${c}`)
        .join("\n");
      const body = stripHtml(html).slice(0, 12000);
      text += `${ogs}\n\n${body}`;
      notes.push(`Page récupérée (HTTP ${res.status}).`);
      mediaUrl = extractMediaUrl(html);
    } else {
      notes.push(`Page inaccessible (HTTP ${res.status}) — analyse sur métadonnées/URL.`);
    }
  } catch (e) {
    notes.push(`Récupération impossible : ${(e as Error).message}`);
  }
  return { text: text.trim().slice(0, 14000), notes, mediaUrl };
}

/** Cherche l'adresse directe de la vidéo/audio dans le HTML public de la page. */
function extractMediaUrl(html: string): string | null {
  const metaVideo = html.match(
    /<meta[^>]+(?:property|name)="(?:og:video:secure_url|og:video:url|og:video|twitter:player:stream|og:audio)"[^>]+content="([^"]+)"/i,
  );
  if (metaVideo?.[1]) return decodeEntities(metaVideo[1]);
  const play = html.match(/"(?:playAddr|downloadAddr|contentUrl|hd_src|sd_src)"\s*:\s*"([^"]+)"/i);
  if (play?.[1]) return decodeEntities(play[1].replace(/\\u002F/gi, "/").replace(/\\\//g, "/"));
  return null;
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/&quot;/g, '"');
}

/** Récupère la vidéo TikTok via Apify lorsque la page ne livre pas le flux direct. */
async function apifyTikTokMedia(url: string): Promise<string | null> {
  const token = process.env["APIFY_TOKEN"];
  if (!token || !/tiktok\.com/i.test(url)) return null;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postURLs: [url], resultsPerPage: 1, shouldDownloadVideos: false }),
      },
    );
    if (!res.ok) return null;
    const items = (await res.json()) as Record<string, unknown>[];
    const first = items?.[0] ?? {};
    const meta = first["videoMeta"] as Record<string, unknown> | undefined;
    const candidate =
      (meta?.["downloadAddr"] as string) ||
      (meta?.["playAddr"] as string) ||
      (first["mediaUrls"] as string[] | undefined)?.[0];
    return typeof candidate === "string" && candidate.startsWith("http") ? candidate : null;
  } catch {
    return null;
  }
}

const MEDIA_MODEL = "google/gemini-3.8-flash";
const MAX_MEDIA_BYTES = 18 * 1024 * 1024;

export type MediaResult = {
  media_url: string | null;
  media_kind: "video" | "audio" | "none";
  transcript: string | null;
  media_analysis: string | null;
};

/**
 * Écoute réellement la vidéo/l'audio de la publication :
 * transcription intégrale horodatée + relevé des injures et propos diffamatoires.
 */
export async function analyzeMedia(
  url: string,
  network: string,
  htmlMediaUrl: string | null,
  apiKey: string,
  notes: string[],
): Promise<MediaResult> {
  const isYouTube = /youtube\.com|youtu\.be/i.test(url);
  let mediaUrl = htmlMediaUrl;
  if (!mediaUrl && !isYouTube) mediaUrl = await apifyTikTokMedia(url);

  let block: Record<string, unknown> | null = null;
  let kind: "video" | "audio" | "none" = "none";

  if (isYouTube) {
    block = { type: "video_url", video_url: { url } };
    kind = "video";
    notes.push("Vidéo YouTube transmise à l'IA pour écoute.");
  } else if (mediaUrl) {
    try {
      const res = await fetch(mediaUrl, {
        headers: { "user-agent": "Mozilla/5.0", referer: url, range: `bytes=0-${MAX_MEDIA_BYTES}` },
      });
      if (res.ok || res.status === 206) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 0 && buf.byteLength <= MAX_MEDIA_BYTES + 1024) {
          const type = res.headers.get("content-type") ?? "video/mp4";
          const isAudio = type.startsWith("audio/");
          kind = isAudio ? "audio" : "video";
          let binary = "";
          for (let i = 0; i < buf.length; i += 0x8000) {
            binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          }
          const b64 = btoa(binary);
          block = isAudio
            ? { type: "input_audio", input_audio: { data: b64, format: type.includes("mp3") ? "mp3" : "m4a" } }
            : { type: "video_url", video_url: { url: `data:${type};base64,${b64}` } };
          notes.push(`Média téléchargé (${Math.round(buf.byteLength / 1024)} Ko) et écouté par l'IA.`);
        } else {
          notes.push("Média trop volumineux pour l'écoute automatique.");
        }
      } else {
        notes.push(`Média inaccessible (HTTP ${res.status}).`);
      }
    } catch (e) {
      notes.push(`Téléchargement média impossible : ${(e as Error).message}`);
    }
  } else {
    notes.push("Aucun flux vidéo/audio public détecté sur cette publication.");
  }

  if (!block) return { media_url: mediaUrl, media_kind: "none", transcript: null, media_analysis: null };

  const instruction =
    `Réseau: ${network}. Écoute et regarde intégralement ce média. ` +
    "Réponds STRICTEMENT en JSON : {\"transcript\":\"transcription mot à mot en français avec horodatages [mm:ss]\"," +
    "\"analysis\":\"relevé des injures, menaces, atteintes à l'emploi et propos diffamatoires visant l'entreprise Ignite (UfG-groupe), ses dirigeants ou ses employés, en français\"}";

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MEDIA_MODEL,
        messages: [{ role: "user", content: [{ type: "text", text: instruction }, block] }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      notes.push(`Écoute IA échouée (${res.status}) : ${body.slice(0, 160)}`);
      return { media_url: mediaUrl, media_kind: kind, transcript: null, media_analysis: null };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const p = JSON.parse(match[0]) as { transcript?: string; analysis?: string };
      notes.push("Transcription audio/vidéo réalisée.");
      return {
        media_url: mediaUrl,
        media_kind: kind,
        transcript: p.transcript ?? null,
        media_analysis: p.analysis ?? null,
      };
    }
    return { media_url: mediaUrl, media_kind: kind, transcript: raw.slice(0, 8000), media_analysis: null };
  } catch (e) {
    notes.push(`Écoute IA impossible : ${(e as Error).message}`);
    return { media_url: mediaUrl, media_kind: kind, transcript: null, media_analysis: null };
  }
}

const SYSTEM_PROMPT =
  "Tu es analyste cyber-intelligence et juriste pour la marque Ignite (Ignite / UfG-groupe) en Afrique de l'Ouest (CEDEAO). " +
  "On te fournit le contenu d'une publication sur un réseau social. Tu dois produire une analyse exploitable en justice. " +
  'Réponds STRICTEMENT en JSON valide, sans texte autour : {"summary":"résumé factuel en français (5 phrases max)",' +
  '"defamatory_excerpts":[{"excerpt":"citation exacte","reason":"en quoi cela diffame ou porte atteinte à l\'entreprise"}],' +
  '"extracted_info":{"auteur":"","date":"","plateforme":"","engagement":"","mentions":"","contacts":"","autres":""},' +
  '"severity":"LOW|MEDIUM|HIGH|CRITICAL","author_handle":"pseudo ou null",' +
  '"analysis":"analyse juridique et réputationnelle en français (6 phrases max)"}. ' +
  "CRITICAL = diffamation grave, usurpation d'identité, accusation d'arnaque nommant la marque ou ses dirigeants.";

async function callModel(
  model: string,
  userContent: string,
  apiKey: string,
): Promise<Analysis | { error: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) return { error: "Limite de requêtes IA atteinte, réessayez." };
    if (res.status === 402) return { error: "Crédits IA épuisés pour cet espace de travail." };
    return { error: `IA ${model} : ${res.status} ${body.slice(0, 200)}` };
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { error: `Réponse IA illisible (${model}).` };
  try {
    const p = JSON.parse(match[0]) as Partial<Analysis>;
    const sev = String(p.severity ?? "").toUpperCase() as Severity;
    return {
      summary: p.summary ?? "",
      defamatory_excerpts: Array.isArray(p.defamatory_excerpts) ? p.defamatory_excerpts : [],
      extracted_info: (p.extracted_info as Record<string, unknown>) ?? {},
      severity: SEVERITIES.includes(sev) ? sev : "MEDIUM",
      author_handle: p.author_handle ?? null,
      analysis: p.analysis ?? "",
    };
  } catch {
    return { error: `JSON IA invalide (${model}).` };
  }
}

export type ScanPublicationResult = {
  network: string;
  post_url: string;
  author_handle: string | null;
  raw_content: string;
  summary: string;
  defamatory_excerpts: { excerpt: string; reason: string }[];
  extracted_info: Record<string, unknown>;
  severity: Severity;
  primary_analysis: string;
  secondary_analysis: string;
  primary_model: string;
  secondary_model: string;
  media_url: string | null;
  media_kind: string;
  transcript: string | null;
  media_analysis: string | null;
  notes: string[];
};

export async function scanPublication(input: {
  network: string;
  url: string;
  context?: string | undefined;
}): Promise<ScanPublicationResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA non configurée (LOVABLE_API_KEY).");

  const { text, notes, mediaUrl } = await fetchPublication(input.url);
  const media = await analyzeMedia(input.url, input.network, mediaUrl, apiKey, notes);

  const userContent =
    `Réseau social: ${input.network}\nURL: ${input.url}\n` +
    (input.context ? `Contexte fourni par l'analyste: ${input.context}\n` : "") +
    (media.transcript
      ? `\nTRANSCRIPTION AUDIO/VIDÉO (écoute IA du média) :\n${media.transcript.slice(0, 8000)}\n`
      : "") +
    (media.media_analysis
      ? `\nRelevé d'écoute (injures / atteintes) :\n${media.media_analysis}\n`
      : "") +
    `\nContenu récupéré:\n${text || "(contenu non récupérable publiquement — analyse l'URL, le réseau et le contexte)"}`;

  const [primary, secondary] = await Promise.all([
    callModel(PRIMARY_MODEL, userContent, apiKey),
    callModel(SECONDARY_MODEL, userContent, apiKey),
  ]);

  const ok = "summary" in primary ? primary : "summary" in secondary ? secondary : null;
  if (!ok) {
    const msgs = [primary, secondary]
      .map((r) => ("error" in r ? r.error : ""))
      .filter(Boolean)
      .join(" | ");
    throw new Error(msgs || "Analyse IA impossible.");
  }
  const other = ok === primary ? secondary : primary;

  const rank = (s: Severity) => SEVERITIES.indexOf(s);
  const severity =
    "summary" in other && rank(other.severity) > rank(ok.severity) ? other.severity : ok.severity;

  const excerpts = [...ok.defamatory_excerpts];
  if ("summary" in other) {
    for (const e of other.defamatory_excerpts) {
      if (!excerpts.some((x) => x.excerpt === e.excerpt)) excerpts.push(e);
    }
  }

  return {
    network: input.network,
    post_url: input.url,
    author_handle: ok.author_handle,
    raw_content: text.slice(0, 8000),
    summary: ok.summary,
    defamatory_excerpts: excerpts,
    extracted_info: {
      ...(("summary" in other ? other.extracted_info : {}) as Record<string, unknown>),
      ...ok.extracted_info,
    },
    severity,
    primary_analysis: "summary" in primary ? primary.analysis : primary.error,
    secondary_analysis: "summary" in secondary ? secondary.analysis : secondary.error,
    primary_model: PRIMARY_MODEL,
    secondary_model: SECONDARY_MODEL,
    notes,
  };
}
