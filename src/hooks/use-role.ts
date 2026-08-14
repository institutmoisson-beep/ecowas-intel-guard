import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "analyst";

/** Rôles de l'utilisateur connecté (source: table user_roles, vérifiée par RLS). */
export function useRoles() {
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return { userId: null as string | null, roles: [] as AppRole[] };
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return {
        userId: user.id,
        email: user.email ?? null,
        roles: (data ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = query.data?.roles ?? [];
  return {
    ...query,
    userId: query.data?.userId ?? null,
    email: query.data?.email ?? null,
    roles,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("admin") || roles.includes("analyst"),
  };
}
