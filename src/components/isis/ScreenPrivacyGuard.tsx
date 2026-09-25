import { useEffect, useRef, useState } from "react";
import { logActivity } from "@/lib/activity";

/**
 * ==========================================================================
 * IMPORTANT — LIMITE TECHNIQUE RÉELLE, À LIRE AVANT D'UTILISER CE COMPOSANT
 * ==========================================================================
 * Un navigateur web ne donne à AUCUN site le pouvoir de bloquer ou même de
 * détecter de façon fiable une capture d'écran (touche « Impr. écran »,
 * outil de capture du système, un autre appareil qui photographie l'écran,
 * un logiciel d'enregistrement vidéo). Il n'existe pas d'API web pour ça.
 * Seules les applications natives peuvent l'empêcher (ex. `FLAG_SECURE` sur
 * Android — et même là, uniquement sur Android ; iOS permet uniquement de
 * *détecter après coup* qu'une capture a eu lieu, jamais de la bloquer).
 *
 * Ce composant ne bloque donc RIEN. Il fait deux choses honnêtes :
 * 1. Il décourage la copie/le glisser-déposer trivial du contenu affiché
 *    (sélection de texte, menu contextuel, drag d'image) — utile contre un
 *    copier-coller occasionnel, inutile contre une vraie capture d'écran.
 * 2. Il appose un filigrane discret (identifiant de l'opérateur + horodatage)
 *    sur le contenu sensible. Si une capture fuite malgré tout, elle reste
 *    traçable jusqu'à la personne qui l'a prise — c'est la seule protection
 *    réaliste contre la capture d'écran dans une application web, et c'est
 *    la même approche qu'utilisent la plupart des outils professionnels.
 *
 * Si un vrai blocage est requis, il faudra empaqueter l'application en
 * app native (ex. via Capacitor) pour activer FLAG_SECURE côté Android ;
 * c'est un changement d'architecture, pas une option de ce composant.
 * ==========================================================================
 */
export function ScreenPrivacyGuard({
  children,
  watermarkLabel,
}: {
  children: React.ReactNode;
  watermarkLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const preventDefault = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", preventDefault);
    el.addEventListener("dragstart", preventDefault);
    el.addEventListener("copy", preventDefault);

    // Signal faible, à visée de journalisation uniquement : la fenêtre a
    // perdu le focus pendant qu'un contenu sensible était affiché. Ce n'est
    // PAS une détection de capture d'écran (voir avertissement ci-dessus) —
    // de nombreux outils de capture système ne déclenchent pas cet évènement.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void logActivity("thread_backgrounded", window.location.pathname);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => setNow(new Date()), 30_000);

    return () => {
      el.removeEventListener("contextmenu", preventDefault);
      el.removeEventListener("dragstart", preventDefault);
      el.removeEventListener("copy", preventDefault);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  const stamp = now.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });

  return (
    <div ref={ref} className="relative select-none [-webkit-touch-callout:none]">
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05]"
        style={{
          backgroundImage: `repeating-linear-gradient(-25deg, transparent, transparent 120px, currentColor 120px, currentColor 121px)`,
        }}
      >
        <div className="flex h-full w-full flex-wrap content-around justify-around">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="-rotate-[25deg] whitespace-nowrap font-mono text-xs">
              {watermarkLabel} · {stamp}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
