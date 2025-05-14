"use client";

import { useEffect } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { EventHeader } from "~/app/_components/event/EventHeader";
import { EventLeaderboard } from "~/app/_components/event/EventLeaderboard";
import type { User } from "@supabase/supabase-js";

interface EventContentProps {
  eventId: string;
  currentUser: User | null;
}

export default function EventContent({
  eventId,
  currentUser,
}: EventContentProps) {
  const { data, isLoading, error } = api.event.getEventWithScores.useQuery({
    eventId,
  });

  if (isLoading) {
    return (
      <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
        <div className="border-greek-gold/30 w-full max-w-4xl rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
          <div className="flex justify-center">
            <div className="border-t-greek-gold h-12 w-12 animate-spin rounded-full border-4 border-white"></div>
          </div>
          <p className="mt-4 text-center text-white">Loading event data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
        <div className="border-greek-gold/30 w-full max-w-4xl rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="mb-6 text-center text-3xl font-bold text-white">
            Error
          </h1>
          <div className="mb-6 rounded bg-red-500/30 p-4 text-center">
            <p className="text-white">
              {error?.message ?? "Failed to load event data"}
            </p>
          </div>
          <div className="text-center">
            <Link
              href="/olympics"
              className="inline-flex items-center rounded-md bg-white/20 px-5 py-3 font-semibold text-white shadow-md transition hover:bg-white/30"
            >
              <span className="mr-2">🏠</span> Back to Olympics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { event, scores } = data;

  return (
    <main className="bg-greek-gradient flex min-h-screen flex-col overflow-x-hidden text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="relative z-10">
          <div className="mb-8 text-center">
            <Link
              href="/olympics"
              className="inline-flex items-center rounded-md bg-white/20 px-4 py-2 font-semibold text-white shadow-md transition hover:bg-white/30"
            >
              <span className="mr-2">←</span> Back to Olympics
            </Link>
          </div>

          <div className="border-greek-gold/30 mb-8 rounded-lg border bg-white/10 p-6 shadow-md">
            <EventHeader event={event} />
          </div>

          <div className="border-greek-gold/30 rounded-lg border bg-white/10 p-6 shadow-md">
            <h2 className="mb-6 flex items-center text-2xl font-bold">
              <span className="mr-2">🏆</span> Event Leaderboard
            </h2>
            <EventLeaderboard scores={scores} />
          </div>
        </div>
      </div>
    </main>
  );
}
