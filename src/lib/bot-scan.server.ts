/**
 * Moteur de veille ISIS (exécuté côté serveur uniquement).
 * Sources : SerpAPI (web/news) + Apify (TikTok) — analyse IA via Lovable AI Gateway.
 * Les résultats sont écrits dans public.alerts (dédupliqués par content_url + keyword).
 */

export const KEYWORDS_TO_MONITOR = [
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

export type RawHit = {
  platform: string;
  keyword: string;
  title: string;
  snippet: string;
  url: string;
  author?: string | null;
};

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

async function serpApiHits(keyword: string, apiKey: string): Promise<RawHit[]> {
  const url =
    "https://serpapi.com/search.json?" +
    new URLSearchParams({
      q: `"${keyword}"`,
      engine: "google",
      gl: "ci",
      hl: "fr",
      num: "10",
      api_key: apiKey,
    });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
  const data = (await res.json()) as {
    organic_results?: { title?: string; snippet?: string; link?: string; source?: string }[];
  };
  return (data.organic_results ?? [])
    .filter((r) => r.link)
    .map((r) => ({
      platform: r.source ?? "Web",
      keyword,
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      url: r.link!,
    }));
}

async function apifyTikTokHits(keyword: string, token: string): Promise<RawHit[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        searchQueries: [keyword],
        resultsPerPage: 5,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      }),
    },
  );
  if (!res.ok) throw new Error(`Apify ${res.status}`);
  const items = (await res.json()) as {
    text?: string;
    webVideoUrl?: string;
    authorMeta?: { name?: string };
  }[];
  return (Array.isArray(items) ? items : [])
    .filter((i) => i.webVideoUrl)
    .map((i) => ({
      platform: "TikTok",
      keyword,
      title: (i.text ?? "").slice(0, 120),
      snippet: i.text ?? "",
      url: i.webVideoUrl!,
      author: i.authorMeta?.name ?? null,
    }));
}

async function analyse(
  hit: RawHit,
  apiKey: string,
): Promise<{ severity: Severity; analysis: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Tu es un analyste cyber-intelligence pour la marque Ignite en Afrique de l'Ouest. " +
            "Réponds STRICTEMENT en JSON: {\"severity\":\"LOW|MEDIUM|HIGH|CRITICAL\",\"analysis\":\"2 phrases max en français\"}. " +
            "CRITICAL = diffamation grave, usurpation d'identité ou arnaque nommant la marque/les dirigeants.",
        },
        {
          role: "user",
          content: `Mot-clé: ${hit.keyword}\nPlateforme: ${hit.platform}\nTitre: ${hit.title}\nContenu: ${hit.snippet}\nURL: ${hit.url}`,
        },
      ],
    }),
  });
  if (!res.ok) return { severity: "MEDIUM", analysis: "Analyse IA indisponible." };
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { severity: "MEDIUM", analysis: text.slice(0, 500) || "Analyse indisponible." };
  try {
    const parsed = JSON.parse(match[0]) as { severity?: string; analysis?: string };
    const sev = (parsed.severity ?? "").toUpperCase() as Severity;
    return {
      severity: SEVERITIES.includes(sev) ? sev : "MEDIUM",
      analysis: parsed.analysis ?? "—",
    };
  } catch {
    return { severity: "MEDIUM", analysis: text.slice(0, 500) };
  }
}

export type ScanResult = {
  ok: boolean;
  keywords: number;
  hits: number;
  inserted: number;
  sources: string[];
  errors: string[];
};

export async function runBotScan(options?: { keywords?: string[] | undefined; limit?: number | undefined }): Promise<ScanResult> {
  const keywords = (options?.keywords?.length ? options.keywords : KEYWORDS_TO_MONITOR).slice(
    0,
    options?.limit ?? 6,
  );
  const serpKey = process.env["SERPAPI_KEY"];
  const apifyToken = process.env["APIFY_TOKEN"];
  const aiKey = process.env["LOVABLE_API_KEY"];
  const errors: string[] = [];
  const sources: string[] = [];
  if (serpKey) sources.push("SerpAPI");
  if (apifyToken) sources.push("Apify/TikTok");
  if (!sources.length) {
    return {
      ok: false,
      keywords: keywords.length,
      hits: 0,
      inserted: 0,
      sources,
      errors: ["Aucune source configurée (SERPAPI_KEY / APIFY_TOKEN manquants)."],
    };
  }

  const hits: RawHit[] = [];
  for (const kw of keywords) {
    if (serpKey) {
      try {
        hits.push(...(await serpApiHits(kw, serpKey)));
      } catch (e) {
        errors.push(`SerpAPI ${kw}: ${(e as Error).message}`);
      }
    }
    if (apifyToken) {
      try {
        hits.push(...(await apifyTikTokHits(kw, apifyToken)));
      } catch (e) {
        errors.push(`Apify ${kw}: ${(e as Error).message}`);
      }
    }
  }

  const seen = new Set<string>();
  const unique = hits.filter((h) => {
    const k = `${h.url}::${h.keyword}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const rows = [] as Record<string, unknown>[];
  for (const hit of unique.slice(0, 60)) {
    const verdict = aiKey
      ? await analyse(hit, aiKey)
      : { severity: "MEDIUM" as Severity, analysis: "Analyse IA non configurée." };
    rows.push({
      platform: hit.platform,
      keyword_triggered: hit.keyword,
      target_name: hit.author ?? hit.title.slice(0, 200) ?? null,
      content_snippet: hit.snippet.slice(0, 4000),
      content_url: hit.url,
      severity: verdict.severity,
      ai_analysis: verdict.analysis,
      status: "PENDING",
      country: "Côte d'Ivoire",
      source: "isis-bot",
      detected_at: new Date().toISOString(),
    });
  }

  let inserted = 0;
  if (rows.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("alerts")
      .upsert(rows as never, {
        onConflict: "content_url,keyword_triggered",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) errors.push(`DB: ${error.message}`);
    inserted = data?.length ?? 0;
  }

  return { ok: errors.length === 0, keywords: keywords.length, hits: unique.length, inserted, sources, errors };
}
