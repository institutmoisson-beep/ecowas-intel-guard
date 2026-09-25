import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  ImagePlus,
  Loader2,
  Mic,
  Plus,
  Send,
  Square,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/isis/PageHeader";
import {
  fetchConversations,
  fetchThread,
  fetchMyProfile,
  currentUserId,
  markRead,
  previewOf,
  sendAttachment,
  sendText,
  signedUrl,
  startConversation,
  subscribeToConversation,
  subscribeToInbox,
  formatDuration,
  type ConversationRow,
  type MessageRow,
} from "@/lib/messaging";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messagerie opérateurs — ISIS" },
      {
        name: "description",
        content:
          "Canal chiffré entre opérateurs ISIS : messages texte, images et notes vocales avec historique.",
      },
      { property: "og:title", content: "Messagerie opérateurs — ISIS" },
      {
        property: "og:description",
        content: "Contact par e-mail ou identifiant unique, historique conservé, temps réel.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newPeer, setNewPeer] = useState("");
  const [openNew, setOpenNew] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: fetchMyProfile });
  const { data: userId } = useQuery({ queryKey: ["me-id"], queryFn: currentUserId });

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  useEffect(() => {
    return subscribeToInbox(() => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [queryClient]);

  const active = useMemo(
    () => (conversations.data ?? []).find((c) => c.conversationId === activeId) ?? null,
    [conversations.data, activeId],
  );

  const open = useMutation({
    mutationFn: (query: string) => startConversation(query),
    onSuccess: async (id) => {
      setOpenNew(false);
      setNewPeer("");
      setActiveId(id);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: unknown) =>
      toast.error("Ouverture impossible", {
        description: e instanceof Error ? e.message : "Destinataire introuvable",
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        code="M7 · CANAL OPÉRATEURS"
        title="Messagerie interne"
        description="Échangez textes, images et notes vocales avec un autre opérateur, identifié par son e-mail ou son identifiant unique. L'historique est conservé et synchronisé en temps réel."
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Nouvelle conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contacter un opérateur</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="label-mono">E-mail ou identifiant (ISIS-XXXXXX)</Label>
                  <Input
                    value={newPeer}
                    onChange={(e) => setNewPeer(e.target.value)}
                    placeholder="operateur@domaine.org"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPeer.trim()) open.mutate(newPeer.trim());
                    }}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!newPeer.trim() || open.isPending}
                  onClick={() => open.mutate(newPeer.trim())}
                >
                  {open.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Ouvrir le canal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <MyHandle handle={me?.handle ?? null} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="panel h-[65vh] overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              {conversations.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
              ) : (conversations.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Aucune conversation. Ouvrez un canal avec l'e-mail ou l'identifiant d'un opérateur.
                </p>
              ) : (
                (conversations.data ?? []).map((c) => (
                  <ConversationItem
                    key={c.conversationId}
                    conversation={c}
                    active={c.conversationId === activeId}
                    onSelect={() => setActiveId(c.conversationId)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="panel flex h-[65vh] flex-col overflow-hidden">
          {active && userId ? (
            <Thread conversation={active} userId={userId} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessagesSquare className="h-8 w-8" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyHandle({ handle }: { handle: string | null }) {
  if (!handle) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="label-mono">Votre identifiant opérateur</span>
      <Badge variant="outline" className="border-verified/40 font-mono text-verified">
        {handle}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Copier l'identifiant"
        onClick={() => {
          void navigator.clipboard.writeText(handle);
          toast.success("Identifiant copié");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationRow;
  active: boolean;
  onSelect: () => void;
}) {
  const name = conversation.peerName ?? conversation.peerEmail ?? "Opérateur";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mb-1 w-full rounded border px-3 py-2 text-left transition-colors ${
        active ? "border-verified/40 bg-verified/10" : "border-transparent hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        {conversation.unread > 0 ? (
          <Badge className="ml-auto bg-threat font-mono text-[10px] text-threat-foreground">
            {conversation.unread}
          </Badge>
        ) : null}
      </div>
      <p className="truncate font-mono text-[11px] text-muted-foreground">
        {conversation.peerHandle ?? ""}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {previewOf(conversation.lastKind, conversation.lastBody)}
      </p>
    </button>
  );
}

function Thread({ conversation, userId }: { conversation: ConversationRow; userId: string }) {
  const queryClient = useQueryClient();
  const conversationId = conversation.conversationId;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");

  const thread = useQuery({
    queryKey: ["thread", conversationId],
    queryFn: () => fetchThread(conversationId),
  });

  useEffect(() => {
    void markRead(conversationId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
    );
    return subscribeToConversation(conversationId, () => {
      void queryClient.invalidateQueries({ queryKey: ["thread", conversationId] });
      void markRead(conversationId);
    });
  }, [conversationId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["thread", conversationId] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const send = useMutation({
    mutationFn: async (text: string) => sendText(conversationId, text),
    onSuccess: () => {
      setDraft("");
      refresh();
    },
    onError: (e: unknown) =>
      toast.error("Envoi impossible", {
        description: e instanceof Error ? e.message : "Erreur réseau",
      }),
  });

  const attach = useMutation({
    mutationFn: async (input: { blob: Blob; kind: "image" | "audio"; durationMs?: number }) =>
      sendAttachment(conversationId, input.blob, input.kind, { durationMs: input.durationMs }),
    onSuccess: refresh,
    onError: (e: unknown) =>
      toast.error("Transfert impossible", {
        description: e instanceof Error ? e.message : "Erreur de stockage",
      }),
  });

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {conversation.peerName ?? conversation.peerEmail ?? "Opérateur"}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {conversation.peerHandle ?? ""} · {conversation.peerEmail ?? ""}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {thread.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement de l'historique…</p>
          ) : (
            (thread.data ?? []).map((m) => (
              <Bubble key={m.id} message={m} mine={m.senderId === userId} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Composer
        draft={draft}
        setDraft={setDraft}
        sending={send.isPending || attach.isPending}
        onSend={() => draft.trim() && send.mutate(draft.trim())}
        onImage={(file) => attach.mutate({ blob: file, kind: "image" })}
        onAudio={(blob, durationMs) => attach.mutate({ blob, kind: "audio", durationMs })}
      />
    </>
  );
}

function Bubble({ message, mine }: { message: MessageRow; mine: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg border px-3 py-2 text-sm ${
          mine ? "border-verified/30 bg-verified/10" : "border-border bg-muted/30"
        }`}
      >
        {message.kind === "text" ? (
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        ) : null}
        {message.kind === "image" && message.path ? <ImageAttachment path={message.path} /> : null}
        {message.kind === "audio" && message.path ? (
          <AudioAttachment path={message.path} durationMs={message.durationMs} />
        ) : null}
        <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

function useSignedUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void signedUrl(path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

function ImageAttachment({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <div className="h-40 w-56 animate-pulse rounded bg-muted/40" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Pièce jointe" className="max-h-64 rounded object-cover" />
    </a>
  );
}

function AudioAttachment({ path, durationMs }: { path: string; durationMs: number | null }) {
  const url = useSignedUrl(path);
  if (!url) return <div className="h-10 w-56 animate-pulse rounded bg-muted/40" />;
  return (
    <div className="flex items-center gap-2">
      <audio controls src={url} className="h-9 w-56" />
      <span className="font-mono text-[10px] text-muted-foreground">
        {formatDuration(durationMs)}
      </span>
    </div>
  );
}

function Composer({
  draft,
  setDraft,
  sending,
  onSend,
  onImage,
  onAudio,
}: {
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onImage: (file: File) => void;
  onAudio: (blob: Blob, durationMs: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const [recording, setRecording] = useState(false);

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (blob.size > 0) onAudio(blob, Date.now() - startedAtRef.current);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Micro indisponible", {
        description: "Autorisez l'accès au microphone pour envoyer une note vocale.",
      });
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImage(file);
          e.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={sending || recording}
        onClick={() => fileRef.current?.click()}
        aria-label="Joindre une image"
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
      <Button
        variant={recording ? "destructive" : "ghost"}
        size="icon"
        disabled={sending && !recording}
        onClick={() => void toggleRecording()}
        aria-label={recording ? "Arrêter l'enregistrement" : "Enregistrer une note vocale"}
      >
        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={recording ? "Enregistrement en cours…" : "Message…"}
        disabled={recording}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button size="icon" disabled={sending || recording || !draft.trim()} onClick={onSend}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
