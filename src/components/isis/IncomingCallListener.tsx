import { useEffect, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptCall,
  declineCall,
  listenForIncomingCalls,
  type CallController,
  type IncomingRing,
} from "@/lib/calls";
import { CallOverlay } from "@/components/isis/CallOverlay";

/**
 * Monté une seule fois dans le layout authentifié : écoute les appels
 * entrants sur toute l'application (pas seulement sur la page Messagerie)
 * et affiche l'écran d'appel une fois accepté.
 */
export function IncomingCallListener() {
  const [ring, setRing] = useState<IncomingRing | null>(null);
  const [active, setActive] = useState<{ ctl: CallController; remote: MediaStream | null } | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      stop = listenForIncomingCalls(data.user.id, (incoming) => setRing(incoming));
    });
    return () => stop?.();
  }, []);

  async function onAccept() {
    if (!ring) return;
    const current = ring;
    setRing(null);
    try {
      const ctl = await acceptCall(current, {
        onRemoteStream: (stream) => setActive((a) => (a ? { ...a, remote: stream } : { ctl, remote: stream })),
        onEnded: () => setActive(null),
      });
      setActive({ ctl, remote: null });
    } catch (e) {
      toast.error("Impossible de rejoindre l'appel", {
        description: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  }

  async function onDecline() {
    if (!ring) return;
    const current = ring;
    setRing(null);
    await declineCall(current).catch(() => undefined);
  }

  return (
    <>
      {ring ? (
        <div className="fixed inset-x-0 top-4 z-[60] mx-auto w-[min(92vw,380px)] rounded-lg border border-verified/40 bg-card p-4 shadow-lg">
          <p className="label-mono text-verified">
            {ring.callKind === "video" ? "Appel vidéo entrant" : "Appel vocal entrant"}
          </p>
          <p className="mt-1 text-sm font-medium">{ring.fromName}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="destructive" size="sm" onClick={() => void onDecline()}>
              <PhoneOff className="h-4 w-4" />
              Refuser
            </Button>
            <Button size="sm" onClick={() => void onAccept()}>
              {ring.callKind === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              Accepter
            </Button>
          </div>
        </div>
      ) : null}

      {active ? (
        <CallOverlay
          title="Appel en cours"
          localStream={active.ctl.localStream}
          tiles={[{ userId: "peer", label: "Correspondant", stream: active.remote }]}
          micOn={active.ctl.localStream.getAudioTracks()[0]?.enabled ?? true}
          camOn={active.ctl.localStream.getVideoTracks()[0]?.enabled ?? false}
          onToggleMic={() => {
            const track = active.ctl.localStream.getAudioTracks()[0];
            if (track) track.enabled = !track.enabled;
            setActive({ ...active });
          }}
          onToggleCam={() => {
            const track = active.ctl.localStream.getVideoTracks()[0];
            if (track) track.enabled = !track.enabled;
            setActive({ ...active });
          }}
          onHangUp={() => {
            void active.ctl.hangUp();
            setActive(null);
          }}
        />
      ) : null}
    </>
  );
}
