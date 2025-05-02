import { createClient } from '@supabase/supabase-js';
import { env } from '~/env';
import type { Database } from '~/lib/supabase/types';

// Admin Supabase client with full access
// To be used for server-side operations requiring admin privileges
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
