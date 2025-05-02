import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { HydrateClient } from "~/trpc/server";

import { notFound } from "next/navigation";
import { db } from "~/server/db";
import EventContent from "./eventContent";

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  // Check if event exists
  const event = await db.event.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!event) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <HydrateClient>
      <EventContent eventId={params.id} currentUser={user} />
    </HydrateClient>
  );
}
