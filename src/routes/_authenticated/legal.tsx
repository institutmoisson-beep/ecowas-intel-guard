import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, Plus } from "lucide-react";
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
import { PageHeader } from "@/components/isis/PageHeader";
import { useRegion, inRegion } from "@/components/isis/region-context";
import { AUTHORITIES, COUNTRIES, statusClass } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/legal")({
  head: () => ({
    meta: [
      { title: "Juridique transnational & Interpol — ISIS" },
      {
        name: "description",
        content:
          "Suivi des plaintes cybercriminalité CEDEAO, mandats Interpol, huissiers et audiences.",
      },
      { property: "og:title", content: "Juridique transnational & Interpol — ISIS" },
      {
        property: "og:description",
        content: "Dossiers multi-juridictions, notices rouges et registre des convocations.",
      },
    ],
  }),
  component: LegalPage,
});

const STATUSES = ["filed", "under_investigation", "warrant_issued", "hearing", "closed"];
const WARRANTS = ["none", "notice_rouge", "notice_verte", "extradition"];

function LegalPage() {
  const { region } = useRegion();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    case_ref: "",
    country: COUNTRIES[0] as string,
    authority: "PLCC Abidjan",
    case_type: "cybercrime_complaint",
    status: "filed",
    warrant_type: "none",
    bailiff_name: "",
    next_hearing: "",
    summary: "",
  });

  const { data } = useQuery({
    queryKey: ["legal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("legal_cases").insert({
        ...form,
        warrant_type: form.warrant_type === "none" ? null : form.warrant_type,
        next_hearing: form.next_hearing || null,
        bailiff_name: form.bailiff_name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dossier juridique ouvert");
      void queryClient.invalidateQueries({ queryKey: ["legal"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Échec", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("legal_cases").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["legal"] }),
  });

  const cases = (data ?? []).filter((c) => inRegion(region, c.country));

  return (
    <div className="space-y-6">
      <PageHeader
        code="// MODULE 04 — JURIDIQUE"
        title="Suivi transnational & mandats Interpol"
        description="Plaintes auprès des unités nationales de cybercriminalité, mandats et audiences."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nouveau dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-mono tracking-widest">DOSSIER JURIDIQUE</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="label-mono">Référence</Label>
                  <Input
                    value={form.case_ref}
                    onChange={(e) => setForm({ ...form, case_ref: e.target.value })}
                    placeholder="PLCC-2026-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Pays</Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) =>
                      setForm({ ...form, country: v, authority: AUTHORITIES[v]?.[0] ?? "" })
                    }
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
                  <Label className="label-mono">Autorité</Label>
                  <Select
                    value={form.authority}
                    onValueChange={(v) => setForm({ ...form, authority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(AUTHORITIES[form.country] ?? []).map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Mandat</Label>
                  <Select
                    value={form.warrant_type}
                    onValueChange={(v) => setForm({ ...form, warrant_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WARRANTS.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Huissier</Label>
                  <Input
                    value={form.bailiff_name}
                    onChange={(e) => setForm({ ...form, bailiff_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-mono">Prochaine audience</Label>
                  <Input
                    type="date"
                    value={form.next_hearing}
                    onChange={(e) => setForm({ ...form, next_hearing: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-mono">Synthèse</Label>
                <Textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </div>
              <Button disabled={!form.case_ref || create.isPending} onClick={() => create.mutate()}>
                Ouvrir le dossier
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {cases.map((c) => (
          <div key={c.id} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold">{c.case_ref}</p>
                <p className="text-xs text-muted-foreground">
                  {c.authority} · {c.country}
                </p>
              </div>
              <Badge variant="outline" className={statusClass(c.status)}>
                {c.status}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{c.summary ?? "—"}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="label-mono">Mandat</p>
                <p className="mt-1 font-mono text-signal">{c.warrant_type ?? "aucun"}</p>
              </div>
              <div>
                <p className="label-mono">Audience</p>
                <p className="mt-1 font-mono">{c.next_hearing ?? "non fixée"}</p>
              </div>
              <div>
                <p className="label-mono">Huissier</p>
                <p className="mt-1 font-mono">{c.bailiff_name ?? "—"}</p>
              </div>
              <div>
                <p className="label-mono">Type</p>
                <p className="mt-1 font-mono">{c.case_type}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Gavel className="h-4 w-4 text-muted-foreground" />
              <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, status: v })}>
                <SelectTrigger className="h-8 w-[200px]">
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
            </div>
          </div>
        ))}
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun dossier sur ce périmètre.</p>
        ) : null}
      </div>
    </div>
  );
}
