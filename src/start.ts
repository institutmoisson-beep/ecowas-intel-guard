import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// En-têtes de sécurité appliqués à toutes les réponses.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response = (result as { response?: Response }).response;
  const headers = response instanceof Response ? response.headers : undefined;
  if (headers) {
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    headers.set("x-dns-prefetch-control", "off");
    headers.set(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    );
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
    headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware, csrfMiddleware],
}));
