/** Liens officiels de signalement / suspension de compte par réseau social. */
export const REPORT_PORTALS: Record<string, { label: string; url: string }[]> = {
  TikTok: [
    { label: "Signalement TikTok (formulaire)", url: "https://www.tiktok.com/legal/report/feedback" },
    {
      label: "Atteinte à la propriété intellectuelle / diffamation",
      url: "https://www.tiktok.com/legal/report/DMCA",
    },
  ],
  Facebook: [
    { label: "Signaler du contenu (Meta)", url: "https://www.facebook.com/help/contact/274459462613911" },
    { label: "Diffamation / contenu illicite", url: "https://www.facebook.com/help/contact/430253071144967" },
  ],
  Instagram: [
    { label: "Signalement Instagram", url: "https://help.instagram.com/contact/383679321740945" },
    { label: "Usurpation d'identité", url: "https://help.instagram.com/contact/636276399721841" },
  ],
  YouTube: [
    { label: "Signalement YouTube", url: "https://support.google.com/youtube/answer/2802027" },
    { label: "Plainte juridique Google", url: "https://support.google.com/legal/troubleshooter/1114905" },
  ],
  "X / Twitter": [
    { label: "Signalement X", url: "https://help.x.com/fr/forms/safety-and-sensitive-content" },
    { label: "Contenu illicite / diffamation", url: "https://help.x.com/fr/forms/private-information" },
  ],
  WhatsApp: [
    { label: "Signaler un compte WhatsApp", url: "https://www.whatsapp.com/contact/?subject=messenger" },
  ],
  Autre: [{ label: "Recherche du portail abuse de la plateforme", url: "https://www.google.com/search?q=report+abuse" }],
};

export function reportPortals(network: string) {
  return REPORT_PORTALS[network] ?? REPORT_PORTALS["Autre"]!;
}

export type SuspensionInput = {
  network: string;
  post_url: string;
  author_handle: string | null;
  severity: string;
  summary: string | null;
  transcript?: string | null;
  excerpts: { excerpt?: string; reason?: string }[];
  scanId: string;
  createdAt: string;
};

/** Construit le courrier de demande de suspension de compte, prêt à envoyer. */
export function buildSuspensionRequest(s: SuspensionInput) {
  const quotes = s.excerpts.length
    ? s.excerpts
        .map((e, i) => `  ${i + 1}. « ${e.excerpt ?? ""} » — ${e.reason ?? ""}`)
        .join("\n")
    : "  (voir la transcription intégrale jointe)";

  return [
    `DEMANDE DE SUSPENSION DE COMPTE — ${s.network.toUpperCase()}`,
    `Émetteur : Ignite Shield & Intelligence Suite (ISIS) — Direction Conformité & Protection de Marque`,
    `Date : ${new Date().toLocaleString("fr-FR")}`,
    `Référence dossier : ${s.scanId}`,
    "",
    `Compte visé : ${s.author_handle ? "@" + s.author_handle : "voir URL"}`,
    `Publication incriminée : ${s.post_url}`,
    `Niveau de gravité évalué : ${s.severity}`,
    "",
    "OBJET",
    "Nous sollicitons la suspension immédiate du compte ci-dessus et le retrait de la publication",
    "signalée. Le contenu, analysé par nos systèmes (transcription audio/vidéo et analyse",
    "juridique automatisée), comporte des propos injurieux et diffamatoires portant atteinte à",
    "la réputation de la société Ignite (UfG-groupe), à ses dirigeants et à l'emploi de ses",
    "collaborateurs en Afrique de l'Ouest (espace CEDEAO).",
    "",
    "RÉSUMÉ DU CONTENU",
    s.summary || "Non disponible.",
    "",
    "PASSAGES INCRIMINÉS (extraits horodatés de la vidéo / du texte)",
    quotes,
    "",
    s.transcript ? "TRANSCRIPTION INTÉGRALE" : "",
    s.transcript ? s.transcript.slice(0, 6000) : "",
    "",
    "FONDEMENTS",
    "— Conditions d'utilisation de la plateforme (harcèlement, diffamation, désinformation).",
    "— Législations nationales des États membres de la CEDEAO réprimant la diffamation,",
    "  l'injure publique et la diffusion de fausses informations.",
    "",
    "DEMANDE",
    "1. Suspension du compte et de tous les comptes liés.",
    "2. Retrait immédiat de la publication et de ses copies.",
    "3. Conservation des données d'identification en vue d'une procédure judiciaire.",
    "",
    "Une copie certifiée de ce dossier de preuve (rapport PDF horodaté) est conservée et peut",
    "être transmise à un huissier de justice ou aux autorités compétentes (PLCC / Interpol).",
    "",
    "Signé : Direction Conformité & Protection de Marque — ISIS",
  ]
    .filter((l) => l !== "")
    .join("\n");
}
