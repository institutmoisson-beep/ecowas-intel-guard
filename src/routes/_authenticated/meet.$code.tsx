import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { CallOverlay, type CallTile } from "@/components/isis/CallOverlay";
import { ScreenPrivacyGuard } from "@/components/isis/ScreenPrivacyGuard";
import {
  MESH_RECOMMENDED_MAX,
  joinMeeting,
  type MeetingController,
  type MeetingParticipant,
} from "@/lib/meetings";
import { fetchMyProfile } from "@/lib/messaging";

export const Route = createFileRoute("/_authenticated/meet/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Réunion ${params.code} — ISIS` },
      { name: "description", content: "Salle de réunion vidéo ISIS." },
    ],
  }),
  component: MeetingRoomPage,
});

function MeetingRoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState<"lobby" | "in-call">("lobby");
  const [wantVideo, setWantVideo] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [handle, setHandle] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const controllerRef = useRef<MeetingController | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const remoteStreams = useRef(new Map<string, MediaStream>());
  const [, forceRender] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    void fetchMyProfile().then((p) => {
      setHandle(p?.handle ?? null);
      setMyId(p?.id ?? null);
    });
  }, []);

  useEffect(() => {
    return () => {
      void controllerRef.current?.leave();
    };
  }, []);

  async function enter() {
    try {
      const ctl = await joinMeeting(code, wantVideo, {
        onRemoteStream: (userId, stream) => {
          remoteStreams.current.set(userId, stream);
          forceRender((n) => n + 1);
        },
        onParticipantsChange: (list) => setParticipants(list),
        onParticipantLeft: (userId) => {
          remoteStreams.current.delete(userId);
          forceRender((n) => n + 1);
        },
      });
      controllerRef.current = ctl;
      ctl.setMic(micOn);
      setLocalStream(ctl.localStream);
      setStage("in-call");
    } catch (e) {
      toast.error("Impossible de rejoindre la réunion", {
        description: e instanceof Error ? e.message : "Lien invalide ou expiré",
      });
    }
  }

  async function leave() {
    await controllerRef.current?.leave();
    controllerRef.current = null;
    void navigate({ to: "/meetings" });
  }

  if (stage === "lobby") {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10">
        <div className="panel space-y-4 p-6 text-center">
          <p className="label-mono text-verified">SALLE {code.toUpperCase()}</p>
          <h1 className="text-lg font-semibold">Rejoindre la réunion</h1>
          <div className="flex justify-center gap-3">
            <Button variant={micOn ? "secondary" : "destructive"} size="icon" onClick={() => setMicOn((v) => !v)}>
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant={wantVideo ? "secondary" : "destructive"} size="icon" onClick={() => setWantVideo((v) => !v)}>
              {wantVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          </div>
          <Button className="w-full" onClick={() => void enter()}>
            Entrer dans la réunion
          </Button>
        </div>
      </div>
    );
  }

  const tiles: CallTile[] = participants
    .filter((p) => p.userId !== myId)
    .map((p) => ({
      userId: p.userId,
      label: p.displayName,
      stream: remoteStreams.current.get(p.userId) ?? null,
    }));

  return (
    <ScreenPrivacyGuard watermarkLabel={handle ?? "OPÉRATEUR"}>
      <CallOverlay
        title={`Réunion ${code.toUpperCase()} · ${participants.length} participant(s)${
          participants.length > MESH_RECOMMENDED_MAX ? " · qualité dégradée au-delà de 6" : ""
        }`}
        localStream={localStream}
        tiles={tiles}
        micOn={micOn}
        camOn={wantVideo}
        onToggleMic={() => {
          const next = !micOn;
          setMicOn(next);
          controllerRef.current?.setMic(next);
        }}
        onToggleCam={() => {
          const next = !wantVideo;
          setWantVideo(next);
          controllerRef.current?.setCam(next);
        }}
        onHangUp={() => void leave()}
      />
    </ScreenPrivacyGuard>
  );
}
