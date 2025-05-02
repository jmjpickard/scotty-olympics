import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { HydrateClient } from "~/trpc/server";
import OlympicsContent from "./olympicsContent";
import type { Database } from "~/lib/supabase/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CookieOptions } from "@supabase/ssr"; // Import CookieOptions if needed for stubs
import type { User } from "@supabase/supabase-js";

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
  } = (await supabase.auth.getUser()) as {
    data: { user: User | null };
  };

  // Fetch initial profile if user exists
  let initialProfile:
    | Database["public"]["Tables"]["participants"]["Row"]
    | null = null;
  if (user) {
    try {
      console.log("[Server] Fetching profile for user:", user.id);

      // Simply fetch the existing profile - don't create one on the server side
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data: profileData, error: profileError } = await supabase
        .from("participants")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        if (profileError.code !== "PGRST116") {
          console.error("[Server] Profile fetch error:", profileError);
        } else {
          // Profile not found (PGRST116 is the "not found" error code)
          console.log(
            "[Server] No participant record found. Will be created client-side.",
          );
        }
      } else if (profileData) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        initialProfile = profileData;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.log(
          "[Server] Found profile with admin status:",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          profileData.is_admin,
        );
      }
    } catch (error) {
      console.error("[Server] Unexpected error fetching profile:", error);
    }
  }

  // Log the raw profile data to verify admin status
  if (initialProfile) {
    console.log("[Server] Raw profile data:", {
      id: initialProfile.id,
      user_id: initialProfile.user_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      is_admin: (initialProfile as any).is_admin,
      email: initialProfile.email,
    });
  }

  // Map the Supabase data (snake_case) to our ParticipantProfile interface (camelCase)
  // Use type assertion to handle the snake_case properties
  const mappedProfile = initialProfile
    ? {
        id: initialProfile.id,
        userId: initialProfile.user_id,
        name: initialProfile.name,
        email: initialProfile.email,
        avatarUrl: initialProfile.avatar_url,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        isAdmin: (initialProfile as any).is_admin === true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        inviteToken: (initialProfile as any).invite_token,
        inviteTokenExpiry:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (initialProfile as any).invite_token_expiry
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              new Date((initialProfile as any).invite_token_expiry)
            : null,
        createdAt: initialProfile.created_at
          ? new Date(initialProfile.created_at)
          : undefined,
      }
    : null;

  console.log(
    "[Server] Mapped profile with admin status:",
    mappedProfile?.isAdmin,
  );

  return (
    <HydrateClient>
      {/* Pass initial user and profile data to the client component */}
      <OlympicsContent initialUser={user} initialProfile={mappedProfile} />
    </HydrateClient>
  );
}
