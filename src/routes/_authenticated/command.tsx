import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertOctagon, Gavel, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/isis/PageHeader";
import { useRegion, inRegion } from "@/components/isis/region-context";
import { threatClass, threatLabel, statusClass } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/command")({
  head: () => ({
    meta: [
      { title: "Command Center — ISIS CEDEAO" },
      {
        name: "description",
        content:
          "Tableau de bord temps réel des menaces, escalades et dossiers juridiques en Afrique de l'Ouest.",
      },
      { property: "og:title", content: "Command Center — ISIS CEDEAO" },
      {
        property: "og:description",
        content: "Vue consolidée des opérations de cyber-intelligence et protection de marque.",
      },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { region } = useRegion();

  const { data } = useQuery({
    queryKey: ["command-overview"],
    queryFn: async () => {
      const [targets, signals, takedowns, cases] = await Promise.all([
        supabase.from("intelligence_targets").select("*").order("created_at", { ascending: false }),
        supabase.from("social_signals").select("*").order("velocity", { ascending: false }),
        supabase.from("takedown_actions").select("*"),
        supabase.from("legal_cases").select("*"),
      ]);
      if (targets.error) throw targets.error;
      return {
        targets: targets.data ?? [],
        signals: signals.data ?? [],
        takedowns: takedowns.data ?? [],
        cases: cases.data ?? [],
      };
    },
  });

  const targets = (data?.targets ?? []).filter((t) => inRegion(region, t.country));
  const signals = (data?.signals ?? []).filter((s) => inRegion(region, s.country));
  const cases = (data?.cases ?? []).filter((c) => inRegion(region, c.country));
  const takedowns = data?.takedowns ?? [];

  const critical = targets.filter((t) => t.threat_level === "critical").length;
  const removed = takedowns.filter((t) => t.status === "taken_down").length;
  const spike = signals.find((s) => s.velocity > 300);

  const stats = [
    { label: "Cibles actives", value: targets.length, icon: Users, tone: "text-foreground" },
    { label: "Menaces critiques", value: critical, icon: AlertOctagon, tone: "text-threat" },
    { label: "Signaux surveillés", value: signals.length, icon: Activity, tone: "text-signal" },
    { label: "Contenus retirés", value: removed, icon: ShieldCheck, tone: "text-verified" },
    { label: "Dossiers juridiques", value: cases.length, icon: Gavel, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        code="// COMMAND CENTER"
        title="Situation opérationnelle"
        description={`Surveillance consolidée — périmètre : ${region === "ALL" ? "toute la zone CEDEAO" : region}.`}
      />

      {spike ? (
        <div className="flex items-start gap-3 rounded border border-threat/40 bg-threat/10 p-4">
          <AlertOctagon className="mt-0.5 h-5 w-5 text-threat" />
          <div>
            <p className="font-mono text-sm font-semibold text-threat">
              ALERTE PIC PRÉDICTIF — vélocité {spike.velocity}/h
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {spike.platform} · {spike.author_handle} · « {spike.keyword} ». Déploiement immédiat
              recommandé d'un contre-récit et d'une notice de retrait.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="label-mono">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.tone}`} />
            </div>
            <p className={`mt-2 font-mono text-3xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <p className="label-mono">Cibles prioritaires</p>
          <div className="mt-3 space-y-2">
            {targets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{t.alias}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.country} · {t.primary_platform ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className={threatClass(t.threat_level)}>
                  {threatLabel[t.threat_level] ?? t.threat_level}
                </Badge>
              </div>
            ))}
            {targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune cible sur ce périmètre.</p>
            ) : null}
          </div>
        </div>

        <div className="panel p-4">
          <p className="label-mono">Dossiers juridiques en cours</p>
          <div className="mt-3 space-y-2">
            {cases.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{c.case_ref}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.authority} · {c.country}
                  </p>
                </div>
                <Badge variant="outline" className={statusClass(c.status)}>
                  {c.status}
                </Badge>
              </div>
            ))}
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dossier sur ce périmètre.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
