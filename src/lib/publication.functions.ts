import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Analyse une publication (réservé au staff : analystes et administrateurs). */
export const scanPublicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { network: string; url: string; context?: string }) => {
    if (!data?.url || !/^https?:\/\//i.test(data.url)) {
      throw new Error("Lien de publication invalide (http/https requis).");
    }
    if (!data.network) throw new Error("Réseau social requis.");
    return data;
  })
  .handler(async ({ context, data }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;
    if (!roles?.length) throw new Error("Habilitation requise (analyste ou administrateur).");

    const { scanPublication } = await import("@/lib/publication-scan.server");
    const result = await scanPublication({
      network: data.network,
      url: data.url,
      context: data.context,
    });

    const { data: row, error: insertError } = await context.supabase
      .from("publication_scans")
      .insert({
        network: result.network,
        post_url: result.post_url,
        author_handle: result.author_handle,
        raw_content: result.raw_content,
        summary: result.summary,
        defamatory_excerpts: result.defamatory_excerpts,
        extracted_info: result.extracted_info,
        severity: result.severity,
        primary_analysis: result.primary_analysis,
        secondary_analysis: result.secondary_analysis,
        primary_model: result.primary_model,
        secondary_model: result.secondary_model,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    return { scan: row, notes: result.notes };
  });
