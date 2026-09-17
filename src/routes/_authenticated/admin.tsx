import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Trash2,
  Plus,
  RefreshCw,
  UserCog,
  Radar,
  Activity,
  MapPin,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { triggerBotScan } from "@/lib/bot.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/isis/PageHeader";
import { useRoles } from "@/hooks/use-role";
import { ADMIN_TABLES, coerceValue } from "@/lib/admin-tables";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — ISIS CEDEAO" },
      {
        name: "description",
        content:
          "Console d'administration ISIS : gestion des rôles opérateurs et de toutes les tables opérationnelles.",
      },
      { property: "og:title", content: "Administration — ISIS CEDEAO" },
      {
        property: "og:description",
        content: "Gestion des habilitations et des données de la plateforme ISIS.",
      },
    ],
  }),
  component: AdminConsole,
});

function AdminConsole() {
  const { isAdmin, isLoading } = useRoles();

  if (isLoading) {
    return <p className="label-mono p-2">Vérification des habilitations…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader
          code="ACCÈS REFUSÉ"
          title="Console d'administration"
          description="Cette console est réservée aux comptes disposant du rôle administrateur."
        />
        <Card className="border-threat/40">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5 text-threat" />
            Habilitation insuffisante. Contactez un administrateur ISIS.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        code="ADMIN / RBAC"
        title="Console d'administration"
        description="Gestion des habilitations opérateurs et administration directe de toutes les tables opérationnelles."
      />
      <Tabs defaultValue="roles">
        <TabsList className="flex-wrap">
          <TabsTrigger value="roles">Rôles & comptes</TabsTrigger>
          <TabsTrigger value="data">Tables opérationnelles</TabsTrigger>
          <TabsTrigger value="bots">Bots & veille</TabsTrigger>
          <TabsTrigger value="activity">Activité & connexions</TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="mt-4">
          <RolesPanel />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <DataPanel />
        </TabsContent>
        <TabsContent value="bots" className="mt-4">
          <BotPanel />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RolesPanel() {
  const qc = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("user_roles").select("*"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      return { profiles: profiles.data ?? [], roles: roles.data ?? [] };
    },
  });

  const grant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "analyst" }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle accordé");
      void qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle révoqué");
      void qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data?.profiles ?? []).map((p) => ({
    ...p,
    roles: (data?.roles ?? []).filter((r) => r.user_id === p.id),
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCog className="h-4 w-4 text-verified" /> Habilitations opérateurs
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void qc.invalidateQueries({ queryKey: ["admin-accounts"] })}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compte</TableHead>
              <TableHead>Identifiant</TableHead>
              <TableHead>Rôles</TableHead>
              <TableHead className="text-right">Accorder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.display_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.roles.length === 0 ? (
                      <span className="label-mono text-muted-foreground">aucun accès</span>
                    ) : (
                      p.roles.map((r) => (
                        <Badge
                          key={r.id}
                          variant="outline"
                          className={
                            r.role === "admin"
                              ? "border-threat/40 bg-threat/10 text-threat"
                              : "border-verified/40 bg-verified/10 text-verified"
                          }
                        >
                          {r.role}
                          <button
                            type="button"
                            className="ml-1 opacity-70 hover:opacity-100"
                            onClick={() => revoke.mutate(r.id)}
                            aria-label={`Révoquer ${r.role}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Select
                    onValueChange={(role) =>
                      grant.mutate({ userId: p.id, role: role as "admin" | "analyst" })
                    }
                  >
                    <SelectTrigger className="ml-auto w-[150px]">
                      <SelectValue placeholder="Ajouter rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="analyst">analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  Aucun compte.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DataPanel() {
  const qc = useQueryClient();
  const [tableName, setTableName] = useState(ADMIN_TABLES[0]!.name);
  const config = useMemo(() => ADMIN_TABLES.find((t) => t.name === tableName)!, [tableName]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: rows, isFetching } = useQuery({
    queryKey: ["admin-table", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const col of config.columns) {
        const v = coerceValue(col.key, form[col.key] ?? "");
        if (v !== null) payload[col.key] = v;
      }
      const { error } = await supabase.from(tableName).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enregistrement créé");
      setForm({});
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin-table", tableName] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enregistrement supprimé");
      void qc.invalidateQueries({ queryKey: ["admin-table", tableName] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Administration des données</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tableName} onValueChange={(v) => setTableName(v as typeof tableName)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_TABLES.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void qc.invalidateQueries({ queryKey: ["admin-table", tableName] })}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer — {config.label}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                {config.columns.map((col) => (
                  <div key={col.key} className="grid gap-1.5">
                    <Label className="label-mono" htmlFor={`f-${col.key}`}>
                      {col.label}
                      {col.required ? " *" : ""}
                    </Label>
                    <Input
                      id={`f-${col.key}`}
                      value={form[col.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [col.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={config.columns.some((c) => c.required && !(form[c.key] ?? "").trim())}
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.slice(0, 6).map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows ?? []).map((row) => (
              <TableRow key={String(row["id"])}>
                {config.columns.slice(0, 6).map((c) => (
                  <TableCell key={c.key} className="max-w-[220px] truncate text-sm">
                    {row[c.key] === null || row[c.key] === undefined ? "—" : String(row[c.key])}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-threat"
                    onClick={() => remove.mutate(String(row["id"]))}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  Aucun enregistrement.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ActivityPanel() {
  const qc = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  const rows = data ?? [];
  const now = Date.now();
  const activeSessions = new Set(
    rows
      .filter((r) => now - new Date(r.created_at).getTime() < 15 * 60 * 1000)
      .map((r) => r.session_id),
  );
  const distinctUsers = new Set(rows.map((r) => r.user_id).filter(Boolean));

  function eventBadge(event: string) {
    if (event === "sign_in" || event === "sign_up") {
      return (
        <Badge variant="outline" className="border-verified/40 bg-verified/10 text-verified">
          {event}
        </Badge>
      );
    }
    return <Badge variant="outline">{event}</Badge>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Activity className="h-5 w-5 text-verified" />
            <div>
              <p className="text-2xl font-semibold">{activeSessions.size}</p>
              <p className="label-mono text-muted-foreground">Sessions actives (15 min)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <UserCog className="h-5 w-5 text-signal" />
            <div>
              <p className="text-2xl font-semibold">{distinctUsers.size}</p>
              <p className="label-mono text-muted-foreground">
                Comptes vus (200 derniers évènements)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <MapPin className="h-5 w-5 text-threat" />
            <div>
              <p className="text-2xl font-semibold">
                {rows.filter((r) => r.latitude !== null && r.longitude !== null).length}
              </p>
              <p className="label-mono text-muted-foreground">Évènements géolocalisés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-verified" /> Journal des connexions & activité
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void qc.invalidateQueries({ queryKey: ["admin-activity"] })}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compte</TableHead>
                <TableHead>Évènement</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Réseau / fuseau</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Horodatage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[180px] truncate text-sm">
                    {r.email ?? r.user_id ?? "—"}
                  </TableCell>
                  <TableCell>{eventBadge(r.event)}</TableCell>
                  <TableCell className="max-w-[160px] truncate font-mono text-xs">
                    {r.path ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {[r.platform, r.screen, r.language].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[r.network, r.timezone].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.latitude !== null && r.longitude !== null
                      ? `${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[100px] truncate font-mono text-xs text-muted-foreground">
                    {r.session_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">
                    Aucune activité enregistrée.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BotPanel() {
  const qc = useQueryClient();
  const scan = useServerFn(triggerBotScan);
  const [last, setLast] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: async () => await scan({ data: { limit: 6 } }),
    onSuccess: (r) => {
      setLast(
        `${r.inserted} nouvelle(s) alerte(s) · ${r.hits} résultats analysés · sources: ${
          r.sources.join(", ") || "aucune"
        }${r.errors.length ? ` · incidents: ${r.errors.join(" | ")}` : ""}`,
      );
      if (r.ok) toast.success("Cycle de veille terminé");
      else toast.warning("Veille terminée avec des avertissements");
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["admin-table", "alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: alerts, isFetching } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-signal" /> Moteur de veille automatisé
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void qc.invalidateQueries({ queryKey: ["alerts"] })}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? "Scan en cours…" : "Lancer un cycle de veille"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Le moteur interroge les sources configurées (recherche web SerpAPI, TikTok via Apify),
            qualifie chaque résultat par IA puis alimente les alertes et les signaux sociaux.
          </p>
          <p className="label-mono">{last ?? "Aucun cycle lancé dans cette session."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernières alertes collectées</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sévérité</TableHead>
                <TableHead>Plateforme</TableHead>
                <TableHead>Mot-clé</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Analyse IA</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(alerts ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Badge variant="outline">{a.severity}</Badge>
                  </TableCell>
                  <TableCell>{a.platform}</TableCell>
                  <TableCell>{a.keyword_triggered}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{a.target_name ?? "—"}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">
                    {a.ai_analysis ?? "—"}
                  </TableCell>
                  <TableCell className="label-mono">{a.source}</TableCell>
                </TableRow>
              ))}
              {(alerts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Aucune alerte pour le moment.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
