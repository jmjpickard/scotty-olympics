import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import type { Database } from "~/lib/supabase/types"; // Assuming types are here

/**
 * tRPC request handler using @supabase/ssr for proper cookie handling
 */
const handler = (req: NextRequest) => {
  // Create a response object to potentially pass to Supabase client for cookie setting
  const res = NextResponse.next();

  // Create Supabase client within the request handler, passing cookie methods directly
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          return Array.from(req.cookies.getAll()).map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll: (cookiesList) => {
          cookiesList.forEach(({ name, value, ...options }) => {
            req.cookies.set({
              name,
              value,
              ...options,
            });
            res.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    },
  );

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      // Fetch authenticated user within the createContext callback using getUser()
      const {
        data: { user }, // Use getUser() which returns the user object directly
      } = await supabase.auth.getUser();
      // We might still need the session object if other parts rely on it
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return createTRPCContext({
        headers: req.headers,
        supabase: supabase,
        session: session, // Pass the session from getSession()
        user: user, // Pass the authenticated user from getUser()
      });
    },
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
