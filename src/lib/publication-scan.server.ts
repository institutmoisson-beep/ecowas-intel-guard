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

export async function fetchPublication(url: string): Promise<{ text: string; notes: string[] }> {
  const notes: string[] = [];
  let text = "";
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
    } else {
      notes.push(`Page inaccessible (HTTP ${res.status}) — analyse sur métadonnées/URL.`);
    }
  } catch (e) {
    notes.push(`Récupération impossible : ${(e as Error).message}`);
  }
  return { text: text.trim().slice(0, 14000), notes };
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
  notes: string[];
};

export async function scanPublication(input: {
  network: string;
  url: string;
  context?: string | undefined;
}): Promise<ScanPublicationResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA non configurée (LOVABLE_API_KEY).");

  const { text, notes } = await fetchPublication(input.url);
  const userContent =
    `Réseau social: ${input.network}\nURL: ${input.url}\n` +
    (input.context ? `Contexte fourni par l'analyste: ${input.context}\n` : "") +
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
