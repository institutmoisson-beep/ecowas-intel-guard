/**
 * Couche WebRTC bas niveau — une RTCPeerConnection par pair distant.
 *
 * Signalisation : ni les offres/réponses SDP ni les candidats ICE ne
 * transitent par la base de données. Tout passe par un canal Supabase
 * Realtime Broadcast éphémère (`room:<room_id>`), au même titre qu'un
 * canal de « présence ». Seul le journal (qui a rejoint/quitté, durée)
 * est persisté côté SQL.
 *
 * ICE : un serveur STUN public (Google) est utilisé par défaut. Pour un
 * usage en production fiable (réseaux mobiles/4G, NAT symétrique), un
 * serveur TURN est nécessaire — voir iceServers() ci-dessous et le
 * LISEZ-MOI pour les variables d'environnement à renseigner.
 */

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrl = import.meta.env["VITE_TURN_URL"] as string | undefined;
  const turnUser = import.meta.env["VITE_TURN_USERNAME"] as string | undefined;
  const turnCred = import.meta.env["VITE_TURN_CREDENTIAL"] as string | undefined;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return servers;
}

export type SignalPayload =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit };

export type PeerHandlers = {
  onTrack: (stream: MediaStream) => void;
  onSignal: (payload: SignalPayload) => void;
  onClose?: () => void;
};

export class PeerLink {
  readonly pc: RTCPeerConnection;
  private remoteStream = new MediaStream();
  private closed = false;

  constructor(
    private readonly handlers: PeerHandlers,
    localStream: MediaStream,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: iceServers() });

    localStream.getTracks().forEach((track) => this.pc.addTrack(track, localStream));

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((t) => this.remoteStream.addTrack(t));
      handlers.onTrack(this.remoteStream);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        handlers.onSignal({ type: "ice", candidate: event.candidate.toJSON() });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (["closed", "failed", "disconnected"].includes(this.pc.connectionState)) {
        this.close();
      }
    };
  }

  /** Côté qui initie la connexion pour ce pair. */
  async makeOffer(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.handlers.onSignal({ type: "offer", sdp: offer });
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.handlers.onSignal({ type: "answer", sdp: answer });
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (this.pc.signalingState === "have-local-offer") {
      await this.pc.setRemoteDescription(sdp);
    }
  }

  async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      /* candidat obsolète après renégociation — sans conséquence */
    }
  }

  replaceLocalStream(stream: MediaStream): void {
    const senders = this.pc.getSenders();
    stream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) void sender.replaceTrack(track);
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.pc.close();
    this.handlers.onClose?.();
  }
}

export async function getLocalStream(withVideo: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: withVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
  });
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}
