import { supabase } from "@/integrations/supabase/client";
import { PeerLink, getLocalStream, stopStream, type SignalPayload } from "@/lib/webrtc";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export type CallKind = "audio" | "video";

export type IncomingRing = {
  roomId: string;
  conversationId: string;
  callKind: CallKind;
  fromId: string;
  fromName: string;
};

/** Canal personnel de sonnerie de l'opérateur — ouvert une seule fois pour toute la session. */
export function listenForIncomingCalls(userId: string, onRing: (ring: IncomingRing) => void) {
  const channel = db
    .channel(`inbox:${userId}`)
    .on("broadcast", { event: "ring" }, (msg: { payload: IncomingRing }) => onRing(msg.payload))
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Session expirée");
  return data.user.id;
}

async function myName(): Promise<string> {
  const { data } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("display_name, handle")
    .eq("id", data.user.id)
    .maybeSingle();
  return profile?.display_name ?? profile?.handle ?? "Opérateur";
}

export type CallController = {
  roomId: string;
  localStream: MediaStream;
  hangUp: () => Promise<void>;
};

type CallCallbacks = {
  onRemoteStream: (stream: MediaStream) => void;
  onEnded: () => void;
};

/** Lance un appel vers l'autre membre de la conversation. */
export async function callConversation(
  conversationId: string,
  peerId: string,
  callKind: CallKind,
  cb: CallCallbacks,
): Promise<CallController> {
  const { data: roomId, error } = await db.rpc("start_direct_call", {
    _conversation_id: conversationId,
    _call_kind: callKind,
  });
  if (error) throw error;

  const [me, name] = await Promise.all([currentUserId(), myName()]);
  const ringChannel = db.channel(`inbox:${peerId}`);
  await ringChannel.subscribe();
  await ringChannel.send({
    type: "broadcast",
    event: "ring",
    payload: { roomId, conversationId, callKind, fromId: me, fromName: name } satisfies IncomingRing,
  });
  void db.removeChannel(ringChannel);

  return joinCallRoom(roomId, callKind, cb, true);
}

/** Rejoint un appel après acceptation d'une sonnerie entrante. */
export async function acceptCall(ring: IncomingRing, cb: CallCallbacks): Promise<CallController> {
  return joinCallRoom(ring.roomId, ring.callKind, cb, false);
}

export async function declineCall(ring: IncomingRing): Promise<void> {
  await db.rpc("join_room", { _room_id: ring.roomId });
  await db.rpc("leave_room", { _room_id: ring.roomId });
}

async function joinCallRoom(
  roomId: string,
  callKind: CallKind,
  cb: CallCallbacks,
  isInitiator: boolean,
): Promise<CallController> {
  await db.rpc("join_room", { _room_id: roomId });
  const localStream = await getLocalStream(callKind === "video");
  const me = await currentUserId();

  let link: PeerLink | null = null;
  const channel = db.channel(`room:${roomId}`, { config: { broadcast: { self: false } } });

  channel.on("broadcast", { event: "signal" }, (msg: { payload: { from: string; signal: SignalPayload } }) => {
    if (msg.payload.from === me || !link) return;
    const signal = msg.payload.signal;
    if (signal.type === "offer") void link.handleOffer(signal.sdp);
    else if (signal.type === "answer") void link.handleAnswer(signal.sdp);
    else void link.handleIce(signal.candidate);
  });

  await channel.subscribe();

  link = new PeerLink(
    {
      onTrack: cb.onRemoteStream,
      onSignal: (signal) => {
        void channel.send({ type: "broadcast", event: "signal", payload: { from: me, signal } });
      },
      onClose: cb.onEnded,
    },
    localStream,
  );

  if (isInitiator) await link.makeOffer();

  const hangUp = async () => {
    stopStream(localStream);
    link?.close();
    void db.removeChannel(channel);
    await db.rpc("leave_room", { _room_id: roomId });
  };

  return { roomId, localStream, hangUp };
}
