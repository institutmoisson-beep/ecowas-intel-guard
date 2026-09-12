import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileSearch,
  Download,
  Loader2,
  Trash2,
  ShieldAlert,
  Copy,
  ExternalLink,
  AudioLines,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { scanPublicationFn } from "@/lib/publication.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/isis/PageHeader";
import { buildSuspensionRequest, reportPortals } from "@/lib/platform-reporting";

export const Route = createFileRoute("/_authenticated/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner de publications & preuves IA — ISIS" },
      {
        name: "description",
        content:
          "Analyse IA d'une publication TikTok, Facebook, WhatsApp ou YouTube : résumé, passages diffamatoires et rapport PDF.",
      },
      { property: "og:title", content: "Scanner de publications & preuves IA — ISIS" },
      {
        property: "og:description",
        content: "Double analyse IA des publications hostiles et dossier de preuve téléchargeable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScannerPage,
});

const NETWORKS = [
  "TikTok",
  "Facebook",
  "WhatsApp",
  "YouTube",
  "Instagram",
  "X / Twitter",
  "Autre",
];

type Excerpt = { excerpt?: string; reason?: string };

type ScanRow = {
  id: string;
  network: string;
  post_url: string;
  author_handle: string | null;
  summary: string | null;
  defamatory_excerpts: unknown;
  extracted_info: unknown;
  severity: string;
  primary_analysis: string | null;
  secondary_analysis: string | null;
  primary_model: string | null;
  secondary_model: string | null;
  raw_content: string | null;
  media_url?: string | null;
  media_kind?: string | null;
  transcript?: string | null;
  media_analysis?: string | null;
  created_at: string;
};

type SuspensionRow = {
  id: string;
  platform: string;
  account_handle: string | null;
  post_url: string;
  report_url: string | null;
  status: string;
  request_body: string | null;
  created_at: string;
};

function sevClass(s: string) {
  if (s === "CRITICAL") return "border-threat/50 text-threat";
  if (s === "HIGH") return "border-amber-500/50 text-amber-500";
  if (s === "MEDIUM") return "border-border text-muted-foreground";
  return "border-verified/50 text-verified";
}

function exportPdf(scan: ScanRow) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const line = (text: string, size = 10, bold = false, gap = 6) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width) as string[];
    for (const l of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(l, margin, y);
      y += size + 2;
    }
    y += gap;
  };

  line("IGNITE SHIELD & INTELLIGENCE SUITE (ISIS)", 14, true, 2);
  line("Rapport d'analyse de publication - Piece de preuve", 11, true, 12);
  line(`Reference: ${scan.id}`);
  line(`Date d'analyse: ${new Date(scan.created_at).toLocaleString("fr-FR")}`);
  line(`Reseau social: ${scan.network}`);
  line(`Auteur identifie: ${scan.author_handle ?? "non identifie"}`);
  line(`Gravite: ${scan.severity}`);
  line(`URL: ${scan.post_url}`, 10, false, 14);

  line("1. Resume de la publication", 12, true);
  line(scan.summary || "Non disponible.", 10, false, 12);

  line("2. Passages diffamatoires / atteintes a l'entreprise", 12, true);
  const excerpts = (Array.isArray(scan.defamatory_excerpts) ? scan.defamatory_excerpts : []) as Excerpt[];
  if (!excerpts.length) line("Aucun passage diffamatoire identifie.", 10, false, 12);
  excerpts.forEach((e, i) => {
    line(`${i + 1}. « ${e.excerpt ?? ""} »`, 10, true, 2);
    line(`Qualification: ${e.reason ?? ""}`, 10, false, 8);
  });

  line("3. Informations extraites", 12, true);
  const info = (scan.extracted_info ?? {}) as Record<string, unknown>;
  const entries = Object.entries(info).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  if (!entries.length) line("Aucune information exploitable.", 10, false, 12);
  entries.forEach(([k, v]) => line(`${k}: ${String(v)}`, 10, false, 2));
  y += 8;

  line(`4. Analyse IA principale (${scan.primary_model ?? "-"})`, 12, true);
  line(scan.primary_analysis || "Non disponible.", 10, false, 10);
  line(`5. Analyse IA de controle (${scan.secondary_model ?? "-"})`, 12, true);
  line(scan.secondary_analysis || "Non disponible.", 10, false, 10);

  line("6. Ecoute du media (transcription audio/video)", 12, true);
  line(`Media detecte: ${scan.media_kind ?? "aucun"}`, 10, false, 4);
  line((scan.transcript || "Aucune transcription disponible.").slice(0, 6000), 9, false, 8);
  if (scan.media_analysis) {
    line("Releve des injures et atteintes releves a l'ecoute", 11, true, 4);
    line(scan.media_analysis, 10, false, 10);
  }

  line("7. Contenu brut collecte", 12, true);
  line((scan.raw_content || "Non disponible.").slice(0, 4000), 9, false, 10);

  line(
    "Document genere automatiquement par ISIS. Les analyses IA sont des aides a la decision et ne remplacent pas une expertise judiciaire.",
    8,
  );

  doc.save(`ISIS-rapport-${scan.network}-${scan.id.slice(0, 8)}.pdf`);
}

function ScannerPage() {
  const queryClient = useQueryClient();
  const [network, setNetwork] = useState("TikTok");
  const [url, setUrl] = useState("");
  const [ctx, setCtx] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const scanFn = useServerFn(scanPublicationFn);

  const { data: history } = useQuery({
    queryKey: ["publication-scans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publication_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as ScanRow[];
    },
  });

  const scan = useMutation({
    mutationFn: async () => scanFn({ data: { network, url, context: ctx } }),
    onSuccess: (res) => {
      toast.success("Publication analysée", {
        description: res.notes?.join(" ") ?? undefined,
      });
      setUrl("");
      setCtx("");
      void queryClient.invalidateQueries({ queryKey: ["publication-scans"] });
    },
    onError: (e: Error) => toast.error("Analyse impossible", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("publication_scans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Analyse supprimée");
      void queryClient.invalidateQueries({ queryKey: ["publication-scans"] });
    },
    onError: (e: Error) => toast.error("Suppression impossible", { description: e.message }),
  });

  const { data: requests } = useQuery({
    queryKey: ["suspension-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suspension_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as SuspensionRow[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (s: ScanRow) => {
      const excerpts = (Array.isArray(s.defamatory_excerpts) ? s.defamatory_excerpts : []) as Excerpt[];
      const body = buildSuspensionRequest({
        network: s.network,
        post_url: s.post_url,
        author_handle: s.author_handle,
        severity: s.severity,
        summary: s.summary,
        transcript: s.transcript ?? null,
        excerpts,
        scanId: s.id,
        createdAt: s.created_at,
      });
      const portal = reportPortals(s.network)[0];
      const { error } = await supabase.from("suspension_requests").insert({
        scan_id: s.id,
        platform: s.network,
        account_handle: s.author_handle,
        post_url: s.post_url,
        report_url: portal?.url ?? null,
        severity: s.severity,
        request_body: body,
        evidence: {
          transcript: (s.transcript ?? "").slice(0, 6000),
          excerpts,
          media_url: s.media_url ?? null,
        } as unknown as never,
      });
      if (error) throw error;
      await navigator.clipboard.writeText(body).catch(() => undefined);
      return portal?.url ?? null;
    },
    onSuccess: (portalUrl) => {
      toast.success("Demande de suspension générée et copiée", {
        description: "Ouvrez le portail officiel et collez la demande avec les preuves.",
      });
      if (portalUrl) window.open(portalUrl, "_blank", "noreferrer");
      void queryClient.invalidateQueries({ queryKey: ["suspension-requests"] });
    },
    onError: (e: Error) => toast.error("Demande impossible", { description: e.message }),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("suspension_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      void queryClient.invalidateQueries({ queryKey: ["suspension-requests"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        code="M6 // PUBLICATION FORENSICS"
        title="Scanner de publications & dossier de preuve"
        description="Identifiez le réseau, collez le lien : deux IA récupèrent le contenu, résument la publication, isolent les passages diffamatoires et génèrent un rapport PDF conservé dans l'historique."
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[200px_1fr_auto]">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger>
              <SelectValue placeholder="Réseau social" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="https://www.tiktok.com/@compte/video/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            onClick={() => scan.mutate()}
            disabled={scan.isPending || !url.trim()}
            className="gap-2"
          >
            {scan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSearch className="h-4 w-4" />
            )}
            Analyser
          </Button>
        </div>
        <Textarea
          className="mt-3"
          rows={2}
          placeholder="Contexte optionnel : transcription WhatsApp, capture, éléments connus sur l'auteur…"
          value={ctx}
          onChange={(e) => setCtx(e.target.value)}
        />
        <p className="mt-2 label-mono text-muted-foreground">
          Double analyse : Google Gemini + modèle de contrôle indépendant.
        </p>
      </div>

      <div className="space-y-3">
        <p className="label-mono text-muted-foreground">
          Historique des analyses ({history?.length ?? 0})
        </p>
        {(history ?? []).map((s) => {
          const excerpts = (Array.isArray(s.defamatory_excerpts)
            ? s.defamatory_excerpts
            : []) as Excerpt[];
          const open = openId === s.id;
          return (
            <div key={s.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {s.network}
                    </Badge>
                    <Badge variant="outline" className={`font-mono text-[10px] ${sevClass(s.severity)}`}>
                      {s.severity}
                    </Badge>
                    <span className="label-mono text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("fr-FR")}
                    </span>
                    {s.author_handle ? (
                      <span className="label-mono text-muted-foreground">@{s.author_handle}</span>
                    ) : null}
                  </div>
                  <a
                    href={s.post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-verified underline-offset-2 hover:underline"
                  >
                    {s.post_url}
                  </a>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{s.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(open ? null : s.id)}>
                    {open ? "Réduire" : "Détails"}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => exportPdf(s)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    disabled={createRequest.isPending}
                    onClick={() => createRequest.mutate(s)}
                  >
                    <ShieldAlert className="h-4 w-4" /> Suspension
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-threat"
                    onClick={() => remove.mutate(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {open ? (
                <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
                  <div>
                    <p className="label-mono text-threat">Passages diffamatoires</p>
                    {excerpts.length ? (
                      <ul className="mt-2 space-y-2">
                        {excerpts.map((e, i) => (
                          <li key={i} className="rounded border border-threat/30 bg-threat/5 p-2">
                            <p className="italic">« {e.excerpt} »</p>
                            <p className="mt-1 text-xs text-muted-foreground">{e.reason}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-muted-foreground">Aucun passage identifié.</p>
                    )}
                  </div>
                  <div>
                    <p className="label-mono text-muted-foreground">Informations extraites</p>
                    <pre className="mt-2 overflow-x-auto rounded bg-muted/30 p-2 text-xs">
                      {JSON.stringify(s.extracted_info ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="label-mono text-muted-foreground">
                        Analyse principale — {s.primary_model}
                      </p>
                      <p className="mt-1">{s.primary_analysis}</p>
                    </div>
                    <div>
                      <p className="label-mono text-muted-foreground">
                        Analyse de contrôle — {s.secondary_model}
                      </p>
                      <p className="mt-1">{s.secondary_analysis}</p>
                    </div>
                  </div>

                  <div>
                    <p className="label-mono flex items-center gap-2 text-muted-foreground">
                      <AudioLines className="h-3.5 w-3.5" />
                      Écoute du média ({s.media_kind ?? "aucun"})
                    </p>
                    {s.media_analysis ? (
                      <p className="mt-1 rounded border border-amber-500/30 bg-amber-500/5 p-2">
                        {s.media_analysis}
                      </p>
                    ) : null}
                    {s.transcript ? (
                      <>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted/30 p-2 text-xs">
                          {s.transcript}
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-2"
                          onClick={() => {
                            void navigator.clipboard.writeText(s.transcript ?? "");
                            toast.success("Transcription copiée");
                          }}
                        >
                          <Copy className="h-4 w-4" /> Copier la transcription
                        </Button>
                      </>
                    ) : (
                      <p className="mt-1 text-muted-foreground">
                        Aucun flux audio/vidéo public exploitable sur cette publication.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="label-mono text-muted-foreground">Portails officiels de signalement</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reportPortals(s.network).map((p) => (
                        <a
                          key={p.url}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted/40"
                        >
                          <ExternalLink className="h-3 w-3" /> {p.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {history && history.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucune analyse enregistrée. Collez le lien d'une publication pour démarrer.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="label-mono text-muted-foreground">
          Demandes de suspension ({requests?.length ?? 0})
        </p>
        {(requests ?? []).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {r.platform}
                </Badge>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {r.status}
                </Badge>
                <span className="label-mono text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("fr-FR")}
                </span>
                {r.account_handle ? (
                  <span className="label-mono text-muted-foreground">@{r.account_handle}</span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{r.post_url}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  void navigator.clipboard.writeText(r.request_body ?? "");
                  toast.success("Demande copiée");
                }}
              >
                <Copy className="h-4 w-4" /> Copier
              </Button>
              {r.report_url ? (
                <a
                  href={r.report_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted/40"
                >
                  <ExternalLink className="h-3 w-3" /> Portail
                </a>
              ) : null}
              <Select
                value={r.status}
                onValueChange={(status) => updateRequest.mutate({ id: r.id, status })}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "submitted", "acknowledged", "suspended", "rejected"].map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {requests && requests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucune demande de suspension. Utilisez le bouton « Suspension » sur une analyse.
          </p>
        ) : null}
      </div>
    </div>
  );
}
