import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { HydrateClient } from "~/trpc/server";
import ProfileContent from "./profileContent";
import { redirect } from "next/navigation";
import type { Database } from "~/lib/supabase/types";
import type { User } from "@supabase/supabase-js";

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // Await the cookies() function call
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Server Components are read-only, so set/remove are not needed here
      },
    },
  );

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user is logged in, redirect to auth page
  if (!user) {
    redirect("/auth");
  }

  return (
    <HydrateClient>
      <ProfileContent profileId={params.id} currentUser={user} />
    </HydrateClient>
  );
}
