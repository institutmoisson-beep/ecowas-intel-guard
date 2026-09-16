import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { logActivity, requestGeolocation } from "@/lib/activity";

/** Journalise les pages consultées par l'opérateur connecté. */
export function ActivityTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    requestGeolocation();
  }, []);

  useEffect(() => {
    void logActivity("page_view", pathname);
  }, [pathname]);

  return null;
}
