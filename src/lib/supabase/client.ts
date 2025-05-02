import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Client-side Supabase client (in browser) using @supabase/ssr
export const createBrowserClient = () => {
  return _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
