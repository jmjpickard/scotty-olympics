import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { HydrateClient } from "~/trpc/server";
import OlympicsContent from "./olympicsContent";
import type { Database } from "~/lib/supabase/types";
import type { CookieOptions } from "@supabase/ssr"; // Import CookieOptions if needed for stubs

export default async function OlympicsPage() {
  // Await the cookies() function call
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Define cookie methods inline for Server Components
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Server Components are read-only, so set/remove are not needed here
        // but the types might expect them. Provide stubs if necessary.
        // set(name: string, value: string, options: CookieOptions) {},
        // remove(name: string, options: CookieOptions) {},
      },
    },
  );

  // Get initial user session server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch initial profile if user exists
  let initialProfile = null;
  if (user) {
    // Simply fetch the existing profile - don't create one on the server side
    const { data: profileData, error: profileError } = await supabase
      .from("participants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[Server] Profile fetch error:", profileError);
    } else if (profileData) {
      initialProfile = profileData;
      // If profile exists, we're done
    } else {
      // Profile will be created on the client side via tRPC
      console.log("[Server] No participant record found. Will be created client-side.");
    }
  }

  return (
    <HydrateClient>
      {/* Pass initial user and profile data to the client component */}
      <OlympicsContent initialUser={user} initialProfile={initialProfile} />
    </HydrateClient>
  );
}
