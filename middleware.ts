import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware function to handle authentication state management using @supabase/ssr
 * Refreshes the session and manages cookies across requests.
 */
export async function middleware(request: NextRequest) {
  // Create an unmodified response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create the Supabase client for middleware context
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request cookies and response cookies
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request cookies and response cookies
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs#managing-session-with-middleware
  // IMPORTANT: Avoid await supabase.auth.getUser() here as it triggers middleware loops in current Next.js versions
  await supabase.auth.getSession();

  return response;
}

/**
 * Specify which routes this middleware should run on
 * Excludes static files and API routes except for the tRPC endpoint
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",

    // Include the tRPC API route
    "/api/trpc/:path*",
  ],
};
