export const COUNTRIES = [
  "Côte d'Ivoire",
  "Bénin",
  "Burkina Faso",
  "Mali",
  "Guinée",
  "Ghana",
  "Sénégal",
  "Togo",
  "Niger",
  "Nigeria",
] as const;

export const THREAT_LEVELS = ["low", "medium", "high", "critical"] as const;
export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export const threatLabel: Record<string, string> = {
  low: "FAIBLE",
  medium: "MOYEN",
  high: "ÉLEVÉ",
  critical: "CRITIQUE",
};

export function threatClass(level: string) {
  switch (level) {
    case "critical":
      return "bg-threat/15 text-threat border-threat/40";
    case "high":
      return "bg-signal/15 text-signal border-signal/40";
    case "medium":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-verified/15 text-verified border-verified/40";
  }
}

export function statusClass(status: string) {
  switch (status) {
    case "taken_down":
    case "closed":
    case "delivered":
      return "bg-verified/15 text-verified border-verified/40";
    case "in_review":
    case "under_investigation":
    case "scheduled":
      return "bg-signal/15 text-signal border-signal/40";
    case "rejected":
      return "bg-threat/15 text-threat border-threat/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export const PLATFORMS = ["TikTok", "Facebook", "YouTube", "Meta", "X", "Telegram", "Instagram"];

export const AUTHORITIES: Record<string, string[]> = {
  "Côte d'Ivoire": ["PLCC Abidjan", "Tribunal d'Abidjan Plateau", "Gendarmerie Nationale"],
  Bénin: ["CNIN Cotonou", "Tribunal de Cotonou"],
  "Burkina Faso": ["CLCT Ouagadougou"],
  Mali: ["BCI Bamako"],
  Guinée: ["OCLCTIC Conakry"],
  Ghana: ["Cyber Security Authority"],
  Sénégal: ["DSC Dakar"],
  Togo: ["CyberDefense Africa"],
  Niger: ["ANSI Niamey"],
  Nigeria: ["EFCC / NPF Cybercrime Unit"],
};

export const DIRECTORY_CATEGORIES = [
  { value: "minister", label: "Ministre" },
  { value: "prosecutor", label: "Procureur" },
  { value: "commissioner", label: "Commissaire de police" },
  { value: "judge", label: "Juge" },
  { value: "chief", label: "Chef de village" },
  { value: "mayor", label: "Maire" },
  { value: "commander", label: "Commandant Gendarmerie" },
  { value: "media_director", label: "Directeur média" },
];

export function categoryLabel(value: string) {
  return DIRECTORY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function maskSecret(value: string | null) {
  if (!value) return "—";
  return value.replace(/^enc::/, "");
}

export function fakeHash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `SHA256:${h.toString(16).padStart(8, "0")}${(h * 7919).toString(16).slice(0, 24)}`;
}
