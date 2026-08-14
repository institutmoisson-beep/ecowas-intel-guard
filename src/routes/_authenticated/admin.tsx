import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2, Plus, RefreshCw, UserCog } from "lucide-react";
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
        </TabsList>
        <TabsContent value="roles" className="mt-4">
          <RolesPanel />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <DataPanel />
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
  const config = useMemo(
    () => ADMIN_TABLES.find((t) => t.name === tableName)!,
    [tableName],
  );
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
                  disabled={config.columns.some(
                    (c) => c.required && !(form[c.key] ?? "").trim(),
                  )}
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
                    {row[c.key] === null || row[c.key] === undefined
                      ? "—"
                      : String(row[c.key])}
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
