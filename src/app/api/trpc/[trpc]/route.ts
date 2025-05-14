import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import type { Database } from "~/lib/supabase/types";

/**
 * Cookie options type with proper typing for each field
 */
interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date | string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  [key: string]: unknown;
}

/**
 * tRPC request handler using @supabase/ssr for proper cookie handling
 */
const handler = async (req: NextRequest) => {
  // Store cookies that need to be set in the response
  const cookiesToSet: {
    name: string;
    value: string;
    options?: CookieOptions;
  }[] = [];

  // Create Supabase client with custom cookie handling
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
        setAll: (cookies) => {
          cookies.forEach((cookie) => {
            cookiesToSet.push({
              name: cookie.name,
              value: cookie.value,
              options: cookie as unknown as CookieOptions,
            });
          });
        },
      },
    },
  );

  // Get the session before handling the request to refresh auth tokens if needed
  await supabase.auth.getSession();

  // Process the request with tRPC's fetch handler
  const trpcResponse = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      // Fetch authenticated user within the createContext callback
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return createTRPCContext({
        headers: req.headers,
        supabase,
        session,
        user,
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

  // Create a new Response object that we can add cookies to
  const finalResponse = new Response(trpcResponse.body, {
    status: trpcResponse.status,
    statusText: trpcResponse.statusText,
    headers: trpcResponse.headers,
  });

  // Apply all stored cookies to the response
  const responseHeaders = new Headers(finalResponse.headers);
  cookiesToSet.forEach(({ name, value, options }) => {
    if (options) {
      // Format cookie header value manually
      const cookieValue = formatCookieHeader(name, value, options);
      responseHeaders.append("Set-Cookie", cookieValue);
    }
  });

  // Return the final response with all headers
  return new Response(finalResponse.body, {
    status: finalResponse.status,
    statusText: finalResponse.statusText,
    headers: responseHeaders,
  });
};

/**
 * Format a cookie string from name, value and options
 */
function formatCookieHeader(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (typeof options.path === "string") {
    cookie += `; Path=${options.path}`;
  }

  if (typeof options.domain === "string") {
    cookie += `; Domain=${options.domain}`;
  }

  if (typeof options.maxAge === "number") {
    cookie += `; Max-Age=${options.maxAge}`;
  }

  if (options.expires) {
    const expires = options.expires;
    cookie += `; Expires=${typeof expires === "string" ? expires : expires.toUTCString()}`;
  }

  if (options.httpOnly) {
    cookie += "; HttpOnly";
  }

  if (options.secure) {
    cookie += "; Secure";
  }

  if (typeof options.sameSite === "string") {
    cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
}

export { handler as GET, handler as POST };
