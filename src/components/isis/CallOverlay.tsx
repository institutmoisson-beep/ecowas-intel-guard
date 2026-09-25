import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CallTile = {
  userId: string;
  label: string;
  stream: MediaStream | null;
  muted?: boolean;
};

/** Interface plein écran d'appel — sert aussi bien pour un appel 1-à-1 que pour une réunion. */
export function CallOverlay({
  title,
  localStream,
  tiles,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onHangUp,
  hint,
}: {
  title: string;
  localStream: MediaStream | null;
  tiles: CallTile[];
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangUp: () => void;
  hint?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="label-mono text-verified">{title}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      <div className="grid flex-1 auto-rows-fr gap-2 overflow-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
        <VideoTile label="Moi" stream={localStream} mirrored muted />
        {tiles.map((t) => (
          <VideoTile key={t.userId} label={t.label} stream={t.stream} muted={t.muted} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-border p-4">
        <Button variant={micOn ? "secondary" : "destructive"} size="icon" onClick={onToggleMic} aria-label="Micro">
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button variant={camOn ? "secondary" : "destructive"} size="icon" onClick={onToggleCam} aria-label="Caméra">
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button variant="destructive" size="icon" onClick={onHangUp} aria-label="Raccrocher">
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function VideoTile({
  label,
  stream,
  mirrored,
  muted,
}: {
  label: string;
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  const hasVideo = (stream?.getVideoTracks().length ?? 0) > 0 && stream?.getVideoTracks()[0]?.enabled;

  return (
    <div className="relative overflow-hidden rounded border border-border bg-card">
      {hasVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div className="flex h-full min-h-[140px] w-full items-center justify-center bg-panel">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-verified/15 font-mono text-lg text-verified">
            {label.slice(0, 2).toUpperCase()}
          </div>
          {/* garde le flux audio actif même sans piste vidéo affichée */}
          <audio ref={ref as unknown as React.RefObject<HTMLAudioElement>} autoPlay muted={muted} />
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[11px]">{label}</span>
    </div>
  );
}
