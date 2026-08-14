export type AdminTable = {
  name:
    | "intelligence_targets"
    | "target_relations"
    | "social_signals"
    | "takedown_actions"
    | "legal_cases"
    | "institutional_directory"
    | "lobbying_engagements";
  label: string;
  /** Colonnes éditables (hors id / created_at). */
  columns: { key: string; label: string; required?: boolean }[];
};

export const ADMIN_TABLES: AdminTable[] = [
  {
    name: "intelligence_targets",
    label: "Cibles OSINT",
    columns: [
      { key: "alias", label: "Alias", required: true },
      { key: "full_name", label: "Nom réel" },
      { key: "primary_platform", label: "Plateforme" },
      { key: "country", label: "Pays", required: true },
      { key: "threat_level", label: "Menace" },
      { key: "status", label: "Statut" },
      { key: "location", label: "Localisation" },
      { key: "phone", label: "Téléphone" },
      { key: "mobile_money", label: "Mobile Money" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    name: "target_relations",
    label: "Relations réseau",
    columns: [
      { key: "source_id", label: "Source (UUID)", required: true },
      { key: "target_id", label: "Cible (UUID)", required: true },
      { key: "relation_type", label: "Type" },
      { key: "weight", label: "Poids" },
    ],
  },
  {
    name: "social_signals",
    label: "Signaux sociaux",
    columns: [
      { key: "keyword", label: "Mot-clé", required: true },
      { key: "platform", label: "Plateforme", required: true },
      { key: "author_handle", label: "Auteur" },
      { key: "country", label: "Pays" },
      { key: "content", label: "Contenu", required: true },
      { key: "content_url", label: "URL" },
      { key: "sentiment", label: "Sentiment" },
      { key: "threat_level", label: "Menace" },
      { key: "velocity", label: "Vélocité" },
      { key: "reach", label: "Portée" },
    ],
  },
  {
    name: "takedown_actions",
    label: "Takedowns",
    columns: [
      { key: "target_id", label: "Cible (UUID)" },
      { key: "platform", label: "Plateforme", required: true },
      { key: "content_url", label: "URL du contenu", required: true },
      { key: "notice_type", label: "Type de notice" },
      { key: "status", label: "Statut" },
      { key: "evidence_hash", label: "Hash preuve" },
      { key: "legal_dossier_url", label: "Dossier légal" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    name: "legal_cases",
    label: "Dossiers juridiques",
    columns: [
      { key: "case_ref", label: "Référence", required: true },
      { key: "country", label: "Pays", required: true },
      { key: "authority", label: "Autorité", required: true },
      { key: "case_type", label: "Type" },
      { key: "target_id", label: "Cible (UUID)" },
      { key: "status", label: "Statut" },
      { key: "warrant_type", label: "Mandat" },
      { key: "next_hearing", label: "Audience (AAAA-MM-JJ)" },
      { key: "bailiff_name", label: "Huissier" },
      { key: "summary", label: "Résumé" },
    ],
  },
  {
    name: "institutional_directory",
    label: "Annuaire institutionnel",
    columns: [
      { key: "country", label: "Pays", required: true },
      { key: "category", label: "Catégorie", required: true },
      { key: "full_name", label: "Nom", required: true },
      { key: "official_title", label: "Titre officiel", required: true },
      { key: "institution", label: "Institution" },
      { key: "phone_encrypted", label: "Ligne directe" },
      { key: "email_encrypted", label: "Email" },
      { key: "region_jurisdiction", label: "Juridiction" },
      { key: "influence_level", label: "Influence" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    name: "lobbying_engagements",
    label: "Pipeline lobbying",
    columns: [
      { key: "contact_id", label: "Contact (UUID)" },
      { key: "country", label: "Pays", required: true },
      { key: "engagement_type", label: "Type" },
      { key: "title", label: "Intitulé", required: true },
      { key: "stage", label: "Étape" },
      { key: "scheduled_for", label: "Date (AAAA-MM-JJ)" },
      { key: "outcome", label: "Résultat" },
    ],
  },
];

const NUMERIC = new Set(["weight", "velocity", "reach"]);

export function coerceValue(key: string, value: string): unknown {
  const v = value.trim();
  if (v === "") return null;
  if (NUMERIC.has(key)) return Number(v);
  return v;
}
