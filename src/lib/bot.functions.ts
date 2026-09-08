import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lance un cycle de veille (réservé aux administrateurs connectés). */
export const triggerBotScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number } | undefined) => data ?? {})
  .handler(async ({ context, data }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Habilitation administrateur requise.");
    }
    const { runBotScan } = await import("@/lib/bot-scan.server");
    return runBotScan({ limit: data.limit });
  });
