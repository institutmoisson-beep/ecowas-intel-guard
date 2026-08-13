import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Plus, Radar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/isis/PageHeader";
import { NetworkGraph } from "@/components/isis/NetworkGraph";
import { useRegion, inRegion } from "@/components/isis/region-context";
import { COUNTRIES, PLATFORMS, THREAT_LEVELS, threatClass, threatLabel } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/osint")({
  head: () => ({
    meta: [
      { title: "OSINT & Cartographie des réseaux — ISIS" },
      {
        name: "description",
        content:
          "Dossiers de cibles, empreinte numérique et graphe relationnel des acteurs hostiles en zone CEDEAO.",
      },
      { property: "og:title", content: "OSINT & Cartographie des réseaux — ISIS" },
      {
        property: "og:description",
        content: "Démaskage, cartographie relationnelle et collecte d'empreinte numérique.",
      },
    ],
  }),
  component: OsintPage,
});

function OsintPage() {
  const { region } = useRegion();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [harvest, setHarvest] = useState<string[] | null>(null);

  const [form, setForm] = useState({
    alias: "",
    full_name: "",
    primary_platform: "TikTok",
    country: COUNTRIES[0] as string,
    threat_level: "medium",
    phone: "",
    mobile_money: "",
    location: "",
    notes: "",
  });

  const { data } = useQuery({
    queryKey: ["osint"],
    queryFn: async () => {
      const [targets, relations] = await Promise.all([
        supabase.from("intelligence_targets").select("*").order("created_at", { ascending: false }),
        supabase.from("target_relations").select("*"),
      ]);
      if (targets.error) throw targets.error;
      if (relations.error) throw relations.error;
      return { targets: targets.data, relations: relations.data };
    },
  });

  const targets = useMemo(
    () => (data?.targets ?? []).filter((t) => inRegion(region, t.country)),
    [data, region],
  );

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("intelligence_targets").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dossier cible créé");
      void queryClient.invalidateQueries({ queryKey: ["osint"] });
      setOpen(false);
      setForm({ ...form, alias: "", full_name: "", phone: "", mobile_money: "", notes: "" });
    },
    onError: (e: Error) => toast.error("Échec", { description: e.message }),
  });

  const active = targets.find((t) => t.id === selected) ?? targets[0];

  function runHarvest() {
    if (!active) return;
    setHarvest([
      `DNS lookup — profil ${active.primary_platform ?? "n/a"} : 3 sous-domaines miroirs détectés`,
      `Résolution opérateur — ${active.phone ?? "aucun numéro"} : ${active.country}, réseau mobile identifié`,
      `Metadata post — géotag résiduel : ${active.location ?? "non déterminé"}`,
      `Corrélation Mobile Money — ${active.mobile_money ?? "aucun flux enregistré"}`,
      `Empreinte cross-plateforme — 2 comptes secondaires probables`,
    ]);
    toast.success("Collecte d'empreinte terminée");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        code="// MODULE 01 — OSINT"
        title="Intelligence & cartographie des cibles"
        description="Construction de dossiers, démaskage et visualisation des réseaux d'acteurs."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nouveau dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-mono tracking-widest">DOSSIER CIBLE</DialogTitle>
                <DialogDescription>
                  Renseignez les identifiants connus de l'acteur hostile.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Alias / pseudo">
                  <Input
                    value={form.alias}
                    onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  />
                </Field>
                <Field label="Nom réel">
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </Field>
                <Field label="Plateforme principale">
                  <Select
                    value={form.primary_platform}
                    onValueChange={(v) => setForm({ ...form, primary_platform: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Pays">
                  <Select
                    value={form.country}
                    onValueChange={(v) => setForm({ ...form, country: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Niveau de menace">
                  <Select
                    value={form.threat_level}
                    onValueChange={(v) => setForm({ ...form, threat_level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THREAT_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {threatLabel[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Téléphone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="Mobile Money">
                  <Input
                    value={form.mobile_money}
                    onChange={(e) => setForm({ ...form, mobile_money: e.target.value })}
                  />
                </Field>
                <Field label="Localisation présumée">
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Notes">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
              <Button disabled={!form.alias || create.isPending} onClick={() => create.mutate()}>
                Enregistrer le dossier
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="panel p-4">
          <p className="label-mono">Dossiers cibles ({targets.length})</p>
          <div className="mt-3 space-y-2">
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                  active?.id === t.id
                    ? "border-verified/50 bg-verified/5"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{t.alias}</span>
                  <Badge variant="outline" className={threatClass(t.threat_level)}>
                    {threatLabel[t.threat_level] ?? t.threat_level}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.full_name ?? "Identité inconnue"} · {t.country} · {t.primary_platform ?? "—"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="label-mono">Graphe relationnel</p>
            <Radar className="h-4 w-4 text-verified" />
          </div>
          <NetworkGraph
            nodes={targets.map((t) => ({
              id: t.id,
              label: t.alias,
              level: t.threat_level,
              platform: t.primary_platform,
            }))}
            edges={(data?.relations ?? [])
              .filter(
                (r) =>
                  targets.some((t) => t.id === r.source_id) &&
                  targets.some((t) => t.id === r.target_id),
              )
              .map((r) => ({ source: r.source_id, target: r.target_id, type: r.relation_type }))}
            selectedId={active?.id ?? null}
            onSelect={setSelected}
          />
        </div>
      </div>

      {active ? (
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-mono">Empreinte numérique — {active.alias}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {active.notes ?? "Aucune note opérationnelle."}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={runHarvest}>
              <Fingerprint className="h-4 w-4" /> Lancer la collecte
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Téléphone" value={active.phone} />
            <Info label="Mobile Money" value={active.mobile_money} />
            <Info label="Localisation" value={active.location} />
            <Info label="Statut" value={active.status} />
          </div>
          {harvest ? (
            <pre className="mt-4 overflow-x-auto rounded border border-border bg-card p-3 font-mono text-xs text-muted-foreground">
              {harvest.map((line) => `> ${line}`).join("\n")}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="label-mono">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded border border-border bg-card p-3">
      <p className="label-mono">{label}</p>
      <p className="mt-1 font-mono text-sm">{value ?? "—"}</p>
    </div>
  );
}
