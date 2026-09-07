import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Bannière d'installation PWA : se déclenche dès que le navigateur le permet. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.sessionStorage.getItem("isis-install-dismissed") === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      // Déclenchement automatique du prompt natif dès que possible.
      void (e as BeforeInstallPromptEvent).prompt().catch(() => undefined);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,26rem)] -translate-x-1/2 rounded-lg border border-verified/40 bg-panel p-3 shadow-lg">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Installer ISIS</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Accès direct depuis l'écran d'accueil, en mode plein écran.
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={async () => {
              if (!deferred) return;
              await deferred.prompt().catch(() => undefined);
              await deferred.userChoice.catch(() => undefined);
              setVisible(false);
            }}
          >
            Installer maintenant
          </Button>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            window.sessionStorage.setItem("isis-install-dismissed", "1");
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
