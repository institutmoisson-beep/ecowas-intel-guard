import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Enregistre le service worker, vérifie régulièrement les nouvelles versions
 * et actualise automatiquement l'application (avec rafraîchissement des données).
 */
export function AppUpdater() {
  const queryClient = useQueryClient();
  const reloading = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let interval: ReturnType<typeof setInterval> | undefined;

    const onControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        const promote = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              toast.info("Nouvelle version ISIS", { description: "Mise à jour en cours…" });
              worker.postMessage("SKIP_WAITING");
            }
          });
        };
        promote(registration.waiting);
        registration.addEventListener("updatefound", () => promote(registration.installing));
        if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");

        // Vérification périodique + au retour sur l'onglet.
        interval = setInterval(() => void registration.update(), 60_000);
        const onVisible = () => {
          if (document.visibilityState === "visible") void registration.update();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
      })
      .catch(() => undefined);

    // Données toujours fraîches au retour de connexion.
    const onOnline = () => void queryClient.invalidateQueries();
    window.addEventListener("online", onOnline);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("online", onOnline);
      if (interval) clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}
