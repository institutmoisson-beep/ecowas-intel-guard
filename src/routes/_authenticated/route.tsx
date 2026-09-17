import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSidebar } from "@/components/isis/AppSidebar";
import { ThreatTicker } from "@/components/isis/ThreatTicker";
import { EscalationDrawer } from "@/components/isis/EscalationDrawer";
import { ActivityTracker } from "@/components/isis/ActivityTracker";
import { RegionProvider, useRegion } from "@/components/isis/region-context";
import { COUNTRIES } from "@/lib/isis";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <RegionProvider>
      <SidebarProvider>
        <ActivityTracker />
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Ticker />
            <header className="flex h-14 items-center gap-3 border-b border-border bg-panel px-3">
              <SidebarTrigger />
              <span className="hidden font-mono text-xs tracking-widest text-muted-foreground sm:inline">
                IGNITE SHIELD &amp; INTELLIGENCE SUITE
              </span>
              <div className="ml-auto flex items-center gap-2">
                <RegionSelector />
                <EscalationDrawer />
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RegionProvider>
  );
}

function Ticker() {
  const { data } = useQuery({
    queryKey: ["ticker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_signals")
        .select("keyword, platform, country, threat_level, velocity")
        .order("velocity", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <ThreatTicker
      items={(data ?? []).map((s) => ({
        label: `${s.country ?? "CEDEAO"} · ${s.platform} · "${s.keyword}" · vélocité ${s.velocity}`,
        level: s.threat_level,
      }))}
    />
  );
}

function RegionSelector() {
  const { region, setRegion } = useRegion();
  return (
    <div className="flex items-center gap-2">
      <Globe2 className="h-4 w-4 text-verified" />
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger className="h-8 w-[170px] font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">TOUTE LA CEDEAO</SelectItem>
          {COUNTRIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
