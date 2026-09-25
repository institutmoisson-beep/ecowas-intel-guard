import { supabase } from "@/integrations/supabase/client";
import { PeerLink, getLocalStream, stopStream, type SignalPayload } from "@/lib/webrtc";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

/**
 * Réunions à plusieurs — maillage WebRTC direct entre navigateurs
 * (chaque participant ouvre une connexion avec chaque autre). Ce
 * schéma fonctionne bien jusqu'à 5-6 participants simultanés ; au-delà,
 * la charge CPU/bande passante de chacun augmente rapidement, comme
 * pour tout appel de groupe pair-à-pair (sans serveur de médias
 * central de type SFU). C'est la limite annoncée dans l'interface.
 */
export const MESH_RECOMMENDED_MAX = 6;

export type MeetingParticipant = {
  userId: string;
  displayName: string;
  handle: string | null;
  micOn: boolean;
  camOn: boolean;
};

export type MeetingCallbacks = {
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onParticipantsChange: (participants: MeetingParticipant[]) => void;
  onParticipantLeft: (userId: string) => void;
};

export type MeetingController = {
  roomId: string;
  localStream: MediaStream;
  setMic: (on: boolean) => void;
  setCam: (on: boolean) => void;
  leave: () => Promise<void>;
};

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Session expirée");
  return data.user.id;
}

export async function createMeeting(title: string): Promise<{ roomId: string; code: string }> {
  const { data, error } = await db.rpc("create_meeting", { _title: title });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { roomId: row.room_id, code: row.room_code };
}

export async function fetchMyRooms(kind?: "direct_call" | "meeting") {
  const { data, error } = await db.rpc("my_rooms", { _kind: kind ?? null });
  if (error) throw error;
  return (data ?? []) as any[];
}

export function meetingLink(code: string): string {
  return `${window.location.origin}/meet/${code}`;
}

export async function joinMeeting(
  code: string,
  withVideo: boolean,
  cb: MeetingCallbacks,
): Promise<MeetingController> {
  const { data: roomId, error } = await db.rpc("join_meeting", { _code: code });
  if (error) throw error;

  const me = await currentUserId();
  const { data: profile } = await db
    .from("profiles")
    .select("display_name, handle")
    .eq("id", me)
    .maybeSingle();
  const myInfo: MeetingParticipant = {
    userId: me,
    displayName: profile?.display_name ?? profile?.handle ?? "Opérateur",
    handle: profile?.handle ?? null,
    micOn: true,
    camOn: withVideo,
  };

  const localStream = await getLocalStream(withVideo);
  const links = new Map<string, PeerLink>();
  const roster = new Map<string, MeetingParticipant>();

  const channel = db.channel(`room:${roomId}`, {
    config: { broadcast: { self: false }, presence: { key: me } },
  });

  function emitRoster() {
    cb.onParticipantsChange(Array.from(roster.values()));
  }

  function connectTo(peerId: string, initiator: boolean) {
    if (links.has(peerId) || peerId === me) return;
    const link = new PeerLink(
      {
        onTrack: (stream) => cb.onRemoteStream(peerId, stream),
        onSignal: (signal) => {
          void channel.send({ type: "broadcast", event: "signal", payload: { from: me, to: peerId, signal } });
        },
        onClose: () => {
          links.delete(peerId);
        },
      },
      localStream,
    );
    links.set(peerId, link);
    if (initiator) void link.makeOffer();
  }

  channel.on(
    "broadcast",
    { event: "signal" },
    (msg: { payload: { from: string; to: string; signal: SignalPayload } }) => {
      const { from, to, signal } = msg.payload;
      if (to !== me) return;
      let link = links.get(from);
      if (!link && signal.type === "offer") {
        link = new PeerLink(
          {
            onTrack: (stream) => cb.onRemoteStream(from, stream),
            onSignal: (s) => {
              void channel.send({ type: "broadcast", event: "signal", payload: { from: me, to: from, signal: s } });
            },
            onClose: () => links?.delete(from),
          },
          localStream,
        );
        links.set(from, link);
      }
      if (!link) return;
      if (signal.type === "offer") void link.handleOffer(signal.sdp);
      else if (signal.type === "answer") void link.handleAnswer(signal.sdp);
      else void link.handleIce(signal.candidate);
    },
  );

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState() as Record<string, MeetingParticipant[]>;
    const seen = new Set<string>();
    for (const [key, entries] of Object.entries(state)) {
      const info = entries[0];
      if (!info) continue;
      seen.add(key);
      roster.set(key, info);
      // Ordre déterministe : l'identifiant le plus petit initie l'offre,
      // ce qui évite que les deux pairs proposent une offre en même temps.
      if (key !== me) connectTo(key, me < key);
    }
    for (const key of Array.from(roster.keys())) {
      if (!seen.has(key)) {
        roster.delete(key);
        links.get(key)?.close();
        links.delete(key);
        cb.onParticipantLeft(key);
      }
    }
    emitRoster();
  });

  await channel.subscribe(async (status: string) => {
    if (status === "SUBSCRIBED") {
      await channel.track(myInfo);
    }
  });

  const setMic = (on: boolean) => {
    localStream.getAudioTracks().forEach((t) => (t.enabled = on));
    myInfo.micOn = on;
    void channel.track(myInfo);
  };
  const setCam = (on: boolean) => {
    localStream.getVideoTracks().forEach((t) => (t.enabled = on));
    myInfo.camOn = on;
    void channel.track(myInfo);
  };

  const leave = async () => {
    stopStream(localStream);
    links.forEach((link) => link.close());
    links.clear();
    void db.removeChannel(channel);
    await db.rpc("leave_room", { _room_id: roomId });
  };

  return { roomId, localStream, setMic, setCam, leave };
}

export async function endMeeting(roomId: string): Promise<void> {
  const { error } = await db.rpc("end_meeting", { _room_id: roomId });
  if (error) throw error;
}
