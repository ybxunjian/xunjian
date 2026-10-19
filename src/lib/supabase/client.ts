import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseConnection } from "./proxy-config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseProxyUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  if (!client) {
    const connection = resolveSupabaseConnection(supabaseUrl, supabaseProxyUrl);
    client = createClient(connection.url, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        ...(connection.authStorageKey
          ? { storageKey: connection.authStorageKey }
          : {}),
      },
    });
  }

  return client;
}
