import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/**
 * Returns true when public Supabase anon environment variables are configured.
 */
export function hasPublicSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let cachedClient: SupabaseClient | null = null;

/**
 * Creates or returns a read-only Supabase client using ONLY the public anon key.
 * Returns null if env vars are absent so static fallback data is used seamlessly.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: { revalidate: 60 },
          }),
      },
    });
  }

  return cachedClient;
}
