import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Plus, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/isis/PageHeader";
import { createMeeting, fetchMyRooms, meetingLink } from "@/lib/meetings";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Réunions — ISIS" },
      { name: "description", content: "Réunions vidéo multi-opérateurs avec lien de participation et historique." },
      { property: "og:title", content: "Réunions — ISIS" },
      { property: "og:description", content: "Créez une réunion, partagez le lien, retrouvez l'historique." },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const rooms = useQuery({ queryKey: ["my-meetings"], queryFn: () => fetchMyRooms("meeting") });

  const create = useMutation({
    mutationFn: (t: string) => createMeeting(t),
    onSuccess: async ({ code }) => {
      setOpen(false);
      setTitle("");
      await rooms.refetch();
      window.location.href = `/meet/${code}`;
    },
    onError: (e: unknown) =>
      toast.error("Création impossible", { description: e instanceof Error ? e.message : "Erreur" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        code="M8 · RÉUNIONS"
        title="Réunions vidéo"
        description="Lancez une réunion et partagez son lien de participation avec les opérateurs concernés. Recommandé jusqu'à 6 participants simultanés pour une qualité stable."
        actions={
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  Rejoindre avec un code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rejoindre une réunion</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Code de réunion"
                  />
                  <Button
                    className="w-full"
                    disabled={!joinCode.trim()}
                    onClick={() => {
                      window.location.href = `/meet/${joinCode.trim()}`;
                    }}
                  >
                    Rejoindre
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Nouvelle réunion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une réunion</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="label-mono">Titre (optionnel)</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Point hebdomadaire" />
                  </div>
                  <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate(title)}>
                    Créer et rejoindre
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="panel divide-y divide-border">
        {rooms.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
        ) : (rooms.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune réunion pour le moment.</p>
        ) : (
          (rooms.data ?? []).map((r) => (
            <div key={r.room_id} className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-verified/10 text-verified">
                <Video className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title ?? "Réunion sans titre"}</p>
                <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" /> {r.participant_count} participant(s) ·{" "}
                  {r.status === "active" ? "en cours" : r.status === "ended" ? "terminée" : "planifiée"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copier le lien"
                onClick={() => {
                  void navigator.clipboard.writeText(meetingLink(r.code));
                  toast.success("Lien copié");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {r.status !== "ended" ? (
                <Button asChild size="sm">
                  <Link to="/meet/$code" params={{ code: r.code }}>
                    Rejoindre
                  </Link>
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
