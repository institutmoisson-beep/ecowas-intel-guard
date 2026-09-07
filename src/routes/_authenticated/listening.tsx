import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/isis/PageHeader";
import { useRegion, inRegion } from "@/components/isis/region-context";
import { threatClass, threatLabel } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/listening")({
  head: () => ({
    meta: [
      { title: "Social Listening & Sentiment prédictif — ISIS" },
      {
        name: "description",
        content:
          "Monitoring temps réel des mots-clés, scoring de menace et alerte de pic d'engagement négatif.",
      },
      { property: "og:title", content: "Social Listening & Sentiment prédictif — ISIS" },
      {
        property: "og:description",
        content: "Détection des campagnes virales hostiles et déploiement de contre-récits.",
      },
    ],
  }),
  component: ListeningPage,
});

const DEFAULT_KEYWORDS = ["Ignite", "Arnaque", "Qnet", "Plainte"];

function ListeningPage() {
  const { region } = useRegion();
  const queryClient = useQueryClient();
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["signals"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_signals")
        .select("*")
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: alertsData } = useQuery({
    queryKey: ["bot-alerts"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const signals = (data ?? [])
    .filter((s) => inRegion(region, s.country))
    .filter((s) => !filter || s.keyword === filter);

  const spike = signals.find((s) => s.velocity > 300);
  const maxVelocity = Math.max(...signals.map((s) => s.velocity), 1);


  const escalate = useMutation({
    mutationFn: async (signal: { content_url: string | null; platform: string }) => {
      const { error } = await supabase.from("takedown_actions").insert({
        platform: signal.platform,
        content_url: signal.content_url ?? "https://unknown",
        notice_type: "defamation",
        status: "submitted",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signal escaladé vers le module Takedown");
      void queryClient.invalidateQueries();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        code="// MODULE 02 — SOCIAL LISTENING"
        title="Écoute sociale & moteur de sentiment prédictif"
        description="Flux temps réel des mots-clés sensibles, scoring IA de menace et alertes de pic."
      />

      {spike ? (
        <div className="flex items-start gap-3 rounded border border-threat/40 bg-threat/10 p-4 pulse-threat">
          <Volume2 className="mt-0.5 h-5 w-5 text-threat" />
          <div>
            <p className="font-mono text-sm font-semibold text-threat">
              PREDICTIVE SPIKE ALERT — {spike.velocity} interactions/h
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Seuil d'engagement négatif dépassé sur « {spike.keyword} » ({spike.platform},{" "}
              {spike.country}). Contre-récit recommandé sous 2 heures.
            </p>
          </div>
        </div>
      ) : null}

      <div className="panel p-4">
        <p className="label-mono">Moniteur de mots-clés</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            onClick={() => setFilter(null)}
            className={`cursor-pointer ${filter === null ? "border-verified/50 text-verified" : "border-border text-muted-foreground"}`}
          >
            TOUS
          </Badge>
          {keywords.map((k) => (
            <Badge
              key={k}
              variant="outline"
              onClick={() => setFilter(k)}
              className={`cursor-pointer font-mono ${filter === k ? "border-verified/50 text-verified" : "border-border text-muted-foreground"}`}
            >
              {k}
            </Badge>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ajouter un mot-clé"
              className="h-8 w-44 font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!draft.trim()) return;
                setKeywords([...keywords, draft.trim()]);
                setDraft("");
              }}
            >
              Suivre
            </Button>
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between">
          <p className="label-mono">Alertes des bots externes (SerpAPI · Apify · Gemini)</p>
          <span className="font-mono text-xs text-muted-foreground">
            {(alertsData ?? []).length} alerte(s)
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {(alertsData ?? []).map((a) => (
            <div key={a.id} className="rounded border border-border/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={threatClass(
                    a.severity.toLowerCase() === "critical"
                      ? "critical"
                      : a.severity.toLowerCase() === "high"
                        ? "high"
                        : a.severity.toLowerCase() === "low"
                          ? "low"
                          : "medium",
                  )}
                >
                  {a.severity}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {a.platform} · {a.keyword_triggered} · {a.status}
                </span>
                {a.content_url ? (
                  <a
                    href={a.content_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto font-mono text-xs text-verified underline"
                  >
                    ouvrir la source
                  </a>
                ) : null}
              </div>
              <p className="mt-2 text-sm">{a.target_name ?? a.content_snippet}</p>
              {a.ai_analysis ? (
                <p className="mt-1 text-xs text-muted-foreground">IA : {a.ai_analysis}</p>
              ) : null}
            </div>
          ))}
          {(alertsData ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune alerte reçue des bots pour le moment.
            </p>
          ) : null}
        </div>
      </div>



      <div className="space-y-3">
        {signals.map((s) => (
          <div key={s.id} className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={threatClass(s.threat_level)}>
                {threatLabel[s.threat_level] ?? s.threat_level}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {s.platform} · {s.author_handle ?? "anonyme"} · {s.country ?? "CEDEAO"}
              </span>
              <span
                className={`ml-auto font-mono text-xs ${s.sentiment === "positive" ? "text-verified" : s.sentiment === "neutral" ? "text-muted-foreground" : "text-threat"}`}
              >
                sentiment: {s.sentiment}
              </span>
            </div>
            <p className="mt-2 text-sm">{s.content}</p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={(s.velocity / maxVelocity) * 100} className="h-1.5" />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {s.velocity}/h · {s.reach.toLocaleString("fr-FR")} vues
              </span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-2"
                onClick={() =>
                  escalate.mutate({ content_url: s.content_url, platform: s.platform })
                }
              >
                <Megaphone className="h-3.5 w-3.5" /> Escalader
              </Button>
            </div>
          </div>
        ))}
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun signal sur ce périmètre.</p>
        ) : null}
      </div>
    </div>
  );
}
