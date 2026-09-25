import { Link, useRouterState } from "@tanstack/react-router";
import {
  Radar,
  Waves,
  ShieldBan,
  Scale,
  Landmark,
  Gauge,
  ShieldHalf,
  LogOut,
  ShieldAlert,
  FileSearch,
  MessagesSquare,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoles } from "@/hooks/use-role";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Command Center", url: "/command", icon: Gauge, badge: "LIVE" },
  { title: "OSINT & Cartographie", url: "/osint", icon: Radar, badge: "M1" },
  { title: "Social Listening", url: "/listening", icon: Waves, badge: "M2" },
  { title: "Takedown Center", url: "/takedowns", icon: ShieldBan, badge: "M3" },
  { title: "Juridique & Interpol", url: "/legal", icon: Scale, badge: "M4" },
  { title: "Annuaire & Lobbying", url: "/directory", icon: Landmark, badge: "M5" },
  { title: "Scanner publications", url: "/scanner", icon: FileSearch, badge: "M6" },
  { title: "Messagerie", url: "/messages", icon: MessagesSquare, badge: "M7" },
  { title: "Réunions", url: "/meetings", icon: Video, badge: "M8" },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useRoles();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-verified/15 text-verified">
            <ShieldHalf className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-bold tracking-widest">ISIS</p>
            <p className="truncate label-mono">CEDEAO / ECOWAS</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="label-mono">Modules opérationnels</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span className="truncate">{item.title}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto border-border font-mono text-[10px] text-muted-foreground"
                      >
                        {item.badge}
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel className="label-mono">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/admin"} tooltip="Administration">
                    <Link to="/admin" className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-threat" />
                      <span className="truncate">Administration</span>
                      <Badge
                        variant="outline"
                        className="ml-auto border-threat/40 font-mono text-[10px] text-threat"
                      >
                        RBAC
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion sécurisée</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
