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
const handler = async (req: NextRequest) => {
  // Create a response object that we'll modify with cookies and return
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
            // Set cookies on both the request (for the current handler) and response (for the client)
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

  // Get the session before handling the request to refresh auth tokens if needed
  await supabase.auth.getSession();

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      // Fetch authenticated user within the createContext callback using getUser()
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // We might still need the session object if other parts rely on it
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return createTRPCContext({
        headers: req.headers,
        supabase: supabase,
        session: session,
        user: user,
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

  // Copy cookies from our response object to a new NextResponse containing the tRPC response
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers([
      ...Array.from(response.headers.entries()),
      ...Array.from(res.headers.entries()),
    ]),
  });
};

export { handler as GET, handler as POST };
