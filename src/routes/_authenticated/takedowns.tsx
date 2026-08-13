import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Copy, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/isis/PageHeader";
import { statusClass } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/takedowns")({
  head: () => ({
    meta: [
      { title: "Takedown & Copyright Command Center — ISIS" },
      {
        name: "description",
        content:
          "Génération de notices DMCA/diffamation, coffre-fort de preuves horodatées et suivi des retraits.",
      },
      { property: "og:title", content: "Takedown & Copyright Command Center — ISIS" },
      {
        property: "og:description",
        content: "Retrait rapide de contenus et export de preuves prêtes pour huissier.",
      },
    ],
  }),
  component: TakedownPage,
});

const STATUSES = ["submitted", "in_review", "taken_down", "rejected"];

function TakedownPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["takedowns"],
    queryFn: async () => {
      const [actions, targets] = await Promise.all([
        supabase.from("takedown_actions").select("*").order("created_at", { ascending: false }),
        supabase.from("intelligence_targets").select("id, alias"),
      ]);
      if (actions.error) throw actions.error;
      return { actions: actions.data ?? [], targets: targets.data ?? [] };
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("takedown_actions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      void queryClient.invalidateQueries({ queryKey: ["takedowns"] });
    },
  });

  const actions = data?.actions ?? [];
  const alias = (id: string | null) =>
    data?.targets.find((t) => t.id === id)?.alias ?? "Cible non liée";

  function generateNotice(action: (typeof actions)[number]) {
    setNotice(
      [
        `NOTICE DE RETRAIT — ${action.notice_type.toUpperCase()}`,
        `Destinataire : ${action.platform} Rights / IP Protection`,
        `Émetteur : Ignite Shield & Intelligence Suite (ISIS) — Département Juridique`,
        `Date : ${new Date().toLocaleString("fr-FR")}`,
        "",
        `URL incriminée : ${action.content_url}`,
        `Acteur identifié : ${alias(action.target_id)}`,
        `Empreinte de preuve : ${action.evidence_hash ?? "à sceller"}`,
        "",
        "Objet : Contenu portant atteinte aux droits de propriété intellectuelle et à la réputation",
        "de la société, constitutif de diffamation au sens des législations nationales des États",
        "membres de la CEDEAO et des conditions d'utilisation de la plateforme.",
        "",
        "Nous demandons le retrait immédiat du contenu ainsi que la suspension du compte associé.",
        "Une copie certifiée de ce dossier est déposée auprès d'un huissier de justice.",
        "",
        "Signé : Direction Conformité & Protection de Marque — ISIS",
      ].join("\n"),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        code="// MODULE 03 — TAKEDOWN"
        title="Centre de commandement retrait & droits d'auteur"
        description="Notices automatisées, coffre-fort de preuves et suivi par lots des escalades plateformes."
      />

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="label-mono">Plateforme</TableHead>
              <TableHead className="label-mono">Cible</TableHead>
              <TableHead className="label-mono">URL</TableHead>
              <TableHead className="label-mono">Preuve</TableHead>
              <TableHead className="label-mono">Statut</TableHead>
              <TableHead className="label-mono text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-sm">{a.platform}</TableCell>
                <TableCell className="text-sm">{alias(a.target_id)}</TableCell>
                <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                  {a.content_url}
                </TableCell>
                <TableCell className="font-mono text-xs text-verified">
                  {a.evidence_hash ?? "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={a.status}
                    onValueChange={(v) => update.mutate({ id: a.id, status: v })}
                  >
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Badge variant="outline" className={statusClass(a.status)}>
                      {a.notice_type}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => generateNotice(a)}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {notice ? (
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="label-mono">Notice générée — export huissier</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  void navigator.clipboard.writeText(notice);
                  toast.success("Notice copiée");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copier
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
                <ShieldBan className="h-3.5 w-3.5" /> Exporter PDF
              </Button>
            </div>
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded border border-border bg-card p-4 font-mono text-xs">
            {notice}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
