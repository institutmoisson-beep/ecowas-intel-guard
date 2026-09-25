/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

/**
 * Messagerie opérateurs : texte, image, audio — historique persistant.
 * Les tables/RPC sont récentes : le type `Database` généré ne les connaît pas
 * encore, d'où le client relâché ci-dessous (à retirer après régénération).
 */
const db = supabase as any;

export const MESSAGES_BUCKET = "messages";

export type MessageKind = "text" | "image" | "audio" | "file";

export type ConversationRow = {
  conversationId: string;
  kind: string;
  title: string | null;
  lastMessageAt: string;
  peerId: string | null;
  peerHandle: string | null;
  peerName: string | null;
  peerEmail: string | null;
  lastKind: MessageKind | null;
  lastBody: string | null;
  lastSender: string | null;
  unread: number;
};

export type MessageRow = {
  id: string;
  kind: MessageKind;
  body: string | null;
  path: string | null;
  mime: string | null;
  durationMs: number | null;
  createdAt: string;
  senderId: string;
  senderName: string | null;
  senderHandle: string | null;
};

export type MyProfile = {
  id: string;
  handle: string | null;
  displayName: string | null;
  email: string | null;
};

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const { data, error } = await db
    .from("profiles")
    .select("id, handle, display_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return {
    id: user.id,
    handle: data?.handle ?? null,
    displayName: data?.display_name ?? null,
    email: data?.email ?? user.email ?? null,
  };
}

export async function fetchConversations(): Promise<ConversationRow[]> {
  const { data, error } = await db.rpc("my_conversations");
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    conversationId: r.c_id,
    kind: r.c_kind,
    title: r.c_title,
    lastMessageAt: r.c_last_at,
    peerId: r.peer_id,
    peerHandle: r.peer_handle,
    peerName: r.peer_name,
    peerEmail: r.peer_email,
    lastKind: r.lm_kind,
    lastBody: r.lm_body,
    lastSender: r.lm_sender,
    unread: r.unread ?? 0,
  }));
}

export async function fetchThread(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await db.rpc("conversation_thread", {
    _conversation_id: conversationId,
    _limit: 300,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.m_id,
    kind: r.m_kind,
    body: r.m_body,
    path: r.m_path,
    mime: r.m_mime,
    durationMs: r.m_duration,
    createdAt: r.m_created_at,
    senderId: r.m_sender,
    senderName: r.m_sender_name,
    senderHandle: r.m_sender_handle,
  }));
}

/** Ouvre ou retrouve une conversation à partir d'un e-mail ou d'un identifiant ISIS-XXXXXX. */
export async function startConversation(query: string): Promise<string> {
  const { data, error } = await db.rpc("start_direct_conversation", { _query: query });
  if (error) throw error;
  return data as string;
}

export async function markRead(conversationId: string): Promise<void> {
  await db.rpc("mark_conversation_read", { _conversation_id: conversationId });
}

export async function sendText(conversationId: string, body: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Session expirée");
  const { error } = await db.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    kind: "text",
    body,
  });
  if (error) throw error;
}

function extensionFor(file: Blob, fallback: string): string {
  const type = file.type || "";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4")) return "m4a";
  if (type.includes("mpeg")) return "mp3";
  return fallback;
}

/** Envoie une pièce jointe (image ou audio) : upload dans le bucket privé puis insertion du message. */
export async function sendAttachment(
  conversationId: string,
  blob: Blob,
  kind: Exclude<MessageKind, "text">,
  options: { durationMs?: number; caption?: string } = {},
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Session expirée");

  const ext = extensionFor(blob, kind === "audio" ? "webm" : "bin");
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(MESSAGES_BUCKET)
    .upload(path, blob, { contentType: blob.type || undefined, upsert: false });
  if (upErr) throw upErr;

  const { error } = await db.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    kind,
    body: options.caption ?? null,
    attachment_path: path,
    attachment_mime: blob.type || null,
    attachment_size: blob.size,
    duration_ms: options.durationMs ?? null,
  });
  if (error) throw error;
}

/** URL signée temporaire pour lire une pièce jointe du bucket privé. */
export async function signedUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MESSAGES_BUCKET)
    .createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Abonnement temps réel aux nouveaux messages d'une conversation. */
export function subscribeToConversation(conversationId: string, onInsert: () => void) {
  const channel = db
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onInsert(),
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}

/** Abonnement global : rafraîchit la liste des conversations. */
export function subscribeToInbox(onChange: () => void) {
  const channel = db
    .channel("messages:inbox")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
      onChange(),
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}

export function formatDuration(ms: number | null): string {
  if (!ms || ms < 0) return "0:00";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function previewOf(kind: MessageKind | null, body: string | null): string {
  if (kind === "image") return "📷 Image";
  if (kind === "audio") return "🎙️ Message vocal";
  if (kind === "file") return "📎 Fichier";
  return body ?? "";
}
