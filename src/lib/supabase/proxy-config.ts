/**
 * Keep the canonical Supabase URL separate from an optional network proxy.
 * A proxy URL must be a standalone HTTPS origin, not a path or query.
 */
export function resolveSupabaseConnection(
  canonicalUrl: string,
  optionalProxyUrl?: string,
): { url: string; authStorageKey?: string } {
  const proxyValue = optionalProxyUrl?.trim();
  if (!proxyValue) return { url: canonicalUrl };

  try {
    const canonical = new URL(canonicalUrl);
    const proxy = new URL(proxyValue);
    if (
      canonical.protocol !== "https:" ||
      proxy.protocol !== "https:" ||
      proxy.username ||
      proxy.password ||
      proxy.pathname !== "/" ||
      proxy.search ||
      proxy.hash
    ) {
      return { url: canonicalUrl };
    }

    // supabase-js uses the first part of the canonical hostname for its
    // default auth localStorage key. Preserve existing user sessions.
    return {
      url: proxy.origin,
      authStorageKey: `sb-${canonical.hostname.split(".")[0]}-auth-token`,
    };
  } catch {
    // An invalid optional setting should never break the existing endpoint.
    return { url: canonicalUrl };
  }
}
