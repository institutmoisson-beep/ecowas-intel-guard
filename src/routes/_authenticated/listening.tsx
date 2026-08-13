import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Volume2, Waves } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/isis/PageHeader";
import { useRegion, inRegion } from "@/components/isis/region-context";
import { threatClass, threatLabel } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated/listening")({
  head: () => ({
    meta: [
      { title: "Social Listening & Sentiment prédictif — ISIS" },
      {
        name: "description",
        content:
          "Monitoring temps réel des mots-clés, scoring de menace et alerte de pic d'engagement négatif.",
      },
      { property: "og:title", content: "Social Listening & Sentiment prédictif — ISIS" },
      {
        property: "og:description",
        content: "Détection des campagnes virales hostiles et déploiement de contre-récits.",
      },
    ],
  }),
  component: ListeningPage;
});

function ListeningPage() {
  return null;
}
