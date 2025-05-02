# Event Page Feature

## Overview

Create a dedicated event page that provides detailed information about individual events and displays participant performance. This page will allow users to view event-specific details and scores in one centralized location.

## Requirements

### 1. Event Details Section

- Display comprehensive event information:
  - Event title
  - Description
  - Date/time (if applicable)
  - Any additional metadata
- Provide a visually appealing presentation of event details
- Include navigation back to the main Olympics page

### 2. Event Leaderboard

- Show a breakdown of scores for the event by participant
- Display participant rankings specific to this event
- Include participant avatars, names, ranks, and points
- Highlight medal positions (gold, silver, bronze)

### 3. Navigation and Access

- Add links to event pages from the main events list
- Implement dynamic routing with event IDs
- Ensure proper loading states and error handling
- Make the page accessible to all users (authenticated or not)

## Technical Implementation

### New Files to Create

1. `src/app/event/[id]/page.tsx` - Server component for the event page
2. `src/app/event/[id]/eventContent.tsx` - Client component for the event content
3. `src/app/_components/event/EventHeader.tsx` - Component for displaying event details
4. `src/app/_components/event/EventLeaderboard.tsx` - Component for displaying event-specific scores

### API Endpoints to Add

1. Add to `src/server/api/routers/event.ts`:
   - `getEventWithScores` - Fetch detailed event data with participant scores

### Database Queries

No schema changes are needed. We'll use the existing models:

- `Event` - For event information
- `Score` - For score data
- `Participant` - For participant information

Create a query that joins these tables to get comprehensive event data with scores.

### UI/UX Considerations

- Use consistent styling with the rest of the application
- Implement responsive design for mobile and desktop views
- Use the existing Greek-themed styling (colors, fonts, etc.)
- Add loading states and error handling
- Ensure accessibility compliance

## Implementation Steps

1. **Create the Event Page Structure**

   - Set up the dynamic route for `/event/[id]`
   - Create server and client components

2. **Implement the API Endpoints**

   - Add new procedures to the event router
   - Create queries to fetch event data with scores

3. **Build the UI Components**

   - Create the event header component
   - Implement the event-specific leaderboard
   - Add navigation elements

4. **Add Navigation**

   - Update the events list to link to event pages
   - Add back navigation to the Olympics page

5. **Testing**
   - Test with various events
   - Verify data accuracy
   - Test on different devices and screen sizes

## Example Code Snippets

### Event Page Route

```tsx
// src/app/event/[id]/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { HydrateClient } from "~/trpc/server";
import EventContent from "./eventContent";
import { notFound } from "next/navigation";
import { db } from "~/server/db";

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
```

### Event Router Addition

```typescript
// Addition to src/server/api/routers/event.ts
getEventWithScores: publicProcedure
  .input(
    z.object({
      eventId: z.string().uuid("Invalid event ID"),
    }),
  )
  .query(async ({ ctx, input }) => {
    try {
      // Get the event details
      const event = await db.event.findUnique({
        where: {
          id: input.eventId,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Get all scores for this event with participant information
      const scores = await db.score.findMany({
        where: {
          eventId: input.eventId,
        },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          rank: "asc",
        },
      });

      return {
        event,
        scores,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Unexpected error fetching event with scores:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while fetching event data",
      });
    }
  }),
```

### Event Content Component

```tsx
// src/app/event/[id]/eventContent.tsx
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
          <h1 className="greek-column-header mb-6 text-center text-3xl font-bold text-white">
            Error
          </h1>
          <div className="mb-6 rounded bg-red-500/30 p-4 text-center">
            <p className="text-white">
              {error?.message || "Failed to load event data"}
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
            <h2 className="greek-column-header mb-6 flex items-center text-2xl font-bold">
              <span className="mr-2">🏆</span> Event Leaderboard
            </h2>
            <EventLeaderboard scores={scores} />
          </div>
        </div>
      </div>
    </main>
  );
}
```

### Event Leaderboard Component

```tsx
// src/app/_components/event/EventLeaderboard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

interface EventLeaderboardProps {
  scores: Array<{
    id: string;
    rank: number;
    points: number;
    participant: {
      id: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }>;
}

export const EventLeaderboard = ({ scores }: EventLeaderboardProps) => {
  if (scores.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-300">No scores recorded for this event yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr className="bg-white/5">
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
              Rank
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
              Athlete
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">
              Points
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {scores.map((score) => {
            // Determine medal class based on ranking
            let medalClass = "";
            let medalEmoji = "";

            if (score.rank === 1) {
              medalClass = "bg-greek-gold/30 font-bold"; // Gold
              medalEmoji = "🥇";
            } else if (score.rank === 2) {
              medalClass = "bg-gray-400/30 font-bold"; // Silver
              medalEmoji = "🥈";
            } else if (score.rank === 3) {
              medalClass = "bg-greek-terracotta/30 font-bold"; // Bronze
              medalEmoji = "🥉";
            }

            return (
              <tr
                key={score.id}
                className={`transition hover:bg-white/5 ${medalClass}`}
              >
                <td className="whitespace-nowrap px-3 py-2 text-sm">
                  {medalEmoji} {score.rank}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-sm">
                  <Link
                    href={`/profile/${score.participant.id}`}
                    className="flex items-center hover:underline"
                  >
                    <Image
                      src={score.participant.avatarUrl ?? "/default-avatar.png"}
                      alt={score.participant.name ?? "Participant"}
                      className="mr-3 rounded-full border-2 border-white/20 object-cover"
                      width={32}
                      height={32}
                      onError={(e) => {
                        // Handle image load error
                        (e.target as HTMLImageElement).src =
                          "/default-avatar.png";
                      }}
                    />
                    {score.participant.name ?? "Anonymous"}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold">
                  {score.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
```

### Integration with Events List

```tsx
// Modified event list item in src/app/olympics/olympicsContent.tsx
{
  events.map((event, index) => (
    <li
      key={event.id}
      className="border-greek-gold/30 rounded-md border bg-white/5 p-4 transition hover:bg-white/10"
    >
      <div className="flex items-start">
        <div className="bg-greek-blue mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-white">
          {index + 1}
        </div>
        <div>
          <Link href={`/event/${event.id}`} className="hover:underline">
            <h3 className="text-lg font-semibold">{event.name}</h3>
          </Link>
          {event.description && (
            <p className="mt-1 text-sm text-gray-300">{event.description}</p>
          )}
        </div>
      </div>
    </li>
  ));
}
```

## Success Criteria

- Event details are displayed clearly and comprehensively
- The event-specific leaderboard shows accurate participant rankings
- Navigation between the Olympics page and event pages is intuitive
- The UI is consistent with the rest of the application
- The page is responsive and works on all device sizes
- Loading states and error handling are implemented properly
- Links to participant profiles are working correctly
