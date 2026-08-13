import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Handshake } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/isis/PageHeader";
import { useRegion, inRegion } from "@/components/isis/region-context";
import { COUNTRIES, DIRECTORY_CATEGORIES, categoryLabel, maskSecret, statusClass } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/directory")({
  head: () => ({
    meta: [
      { title: "Annuaire institutionnel & Lobbying CEDEAO — ISIS" },
      {
        name: "description",
        content:
          "Registre chiffré des autorités ouest-africaines et pipeline d'influence institutionnelle.",
      },
      { property: "og:title", content: "Annuaire institutionnel & Lobbying CEDEAO — ISIS" },
      {
        property: "og:description",
        content: "Ministres, procureurs, commissaires, chefs et maires — contacts et interventions.",
      },
    ],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const { region } = useRegion();
  const queryClient = useQueryClient();
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    country: COUNTRIES[0] as string,
    category: "prosecutor",
    full_name: "",
    official_title: "",
    phone_encrypted: "",
    email_encrypted: "",
    region_jurisdiction: "",
    influence_level: "3",
    notes: "",
  });

  const { data } = useQuery({
    queryKey: ["directory"],
    queryFn: async () => {
      const [dir, eng] = await Promise.all([
        supabase.from("institutional_directory").select("*").order("influence_level", {
          ascending: false,
        }),
        supabase
          .from("lobbying_engagements")
          .select("*")
          .order("scheduled_for", { ascending: false }),
      ]);
      if (dir.error) throw dir.error;
      return { officials: dir.data ?? [], engagements: eng.data ?? [] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("institutional_directory").insert({
        ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact institutionnel enregistré");
      void queryClient.invalidateQueries({ queryKey: ["directory"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Échec", { description: e.message }),
  });

  const officials = (data?.officials ?? [])
    .filter((o) => inRegion(region, o.country))
    .filter((o) => category === "all" || o.category === category);

  const engagements = (data?.engagements ?? []).filter((e) => inRegion(region, e.country));

  return (
    <div className="space-y-6">
      <PageHeader
        code="// MODULE 05 — INSTITUTIONNEL"
        title="Annuaire des autorités & hub de lobbying"
        description="Registre à accès restreint des décideurs CEDEAO et suivi des interventions d'influence."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nouveau contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-mono tracking-widest">CONTACT OFFICIEL</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="label-mono">Nom complet</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Titre officiel</Label>
                  <Input
                    value={form.official_title}
                    onChange={(e) => setForm({ ...form, official_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Pays</Label>
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
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Catégorie</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTORY_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Ligne directe</Label>
                  <Input
                    value={form.phone_encrypted}
                    onChange={(e) => setForm({ ...form, phone_encrypted: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Email</Label>
                  <Input
                    value={form.email_encrypted}
                    onChange={(e) => setForm({ ...form, email_encrypted: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Ressort / Région</Label>
                  <Input
                    value={form.region_jurisdiction}
                    onChange={(e) => setForm({ ...form, region_jurisdiction: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Niveau d'influence (1-5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={form.influence_level}
                    onChange={(e) => setForm({ ...form, influence_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-mono">Notes / Historique</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button
                disabled={!form.full_name || !form.official_title || create.isPending}
                onClick={() => create.mutate()}
              >
                Enregistrer
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Annuaire</TabsTrigger>
          <TabsTrigger value="lobbying">Pipeline de lobbying</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              onClick={() => setCategory("all")}
              className={`cursor-pointer ${category === "all" ? "border-verified/50 text-verified" : "text-muted-foreground"}`}
            >
              TOUTES
            </Badge>
            {DIRECTORY_CATEGORIES.map((c) => (
              <Badge
                key={c.value}
                variant="outline"
                onClick={() => setCategory(c.value)}
                className={`cursor-pointer ${category === c.value ? "border-verified/50 text-verified" : "text-muted-foreground"}`}
              >
                {c.label}
              </Badge>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {officials.map((o) => {
              const shown = reveal[o.id];
              return (
                <div key={o.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{o.full_name}</p>
                      <p className="text-xs text-muted-foreground">{o.official_title} · {categoryLabel(o.category)}</p>
                    </div>
                    <Badge variant="outline" className="border-signal/40 text-signal">
                      INF {o.influence_level ?? 1}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {o.country} · {o.region_jurisdiction ?? "national"}
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-xs">
                    <p>☎ {shown ? (o.phone_encrypted ?? "—") : maskSecret(o.phone_encrypted)}</p>
                    <p>✉ {shown ? (o.email_encrypted ?? "—") : maskSecret(o.email_encrypted)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-2"
                    onClick={() => setReveal({ ...reveal, [o.id]: !shown })}
                  >
                    {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {shown ? "Masquer" : "Déchiffrer"}
                  </Button>
                  {o.notes ? (
                    <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                      {o.notes}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {officials.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun contact sur ce périmètre.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="lobbying" className="mt-4 space-y-3">
          {engagements.map((e) => (
            <div key={e.id} className="panel flex items-start gap-3 p-4">
              <Handshake className="mt-0.5 h-4 w-4 text-verified" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{e.title}</p>
                  <Badge variant="outline" className={statusClass(e.stage)}>
                    {e.stage}
                  </Badge>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {e.scheduled_for ?? "—"} · {e.country}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{e.outcome ?? "Suivi en cours"}</p>
                <p className="mt-1 font-mono text-xs text-signal">{e.engagement_type}</p>
              </div>
            </div>
          ))}
          {engagements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune action de lobbying enregistrée.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
