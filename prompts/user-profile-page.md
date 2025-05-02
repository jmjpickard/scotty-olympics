# User Profile Page Feature

## Overview

Create a dedicated user profile page that provides different views based on who is viewing it. This page will serve as a central hub for participant information and performance data.

## Requirements

### 1. Personal Profile View (Self-View)

When a user views their own profile:

- Display their personal information (name, email, avatar)
- Allow editing of profile information
- Show the existing avatar upload functionality
- Display a comprehensive breakdown of their event participation and scores
- Show their overall rank and total points in the Olympics

### 2. Public Profile View (Other-View)

When a user views another participant's profile:

- Display the participant's public information (name, avatar)
- Show a read-only view of their event performance
- Display a table with event participation, scores, and timestamps
- Show their overall rank and total points

### 3. Score Breakdown Table

- Create a table showing all events the participant has competed in
- For each event, display:
  - Event name
  - Event date/time
  - Participant's rank in the event
  - Points earned
  - Any additional metadata (e.g., description)

### 4. Navigation and Access

- Add profile links to participant names in the leaderboard
- Add a "View Profile" button in the user section of the Olympics page
- Ensure proper routing with dynamic URLs (`/profile/[id]`)

## Technical Implementation

### New Files to Create

1. `src/app/profile/[id]/page.tsx` - Server component for the profile page
2. `src/app/profile/[id]/profileContent.tsx` - Client component for the profile content
3. `src/app/_components/user/ScoreHistory.tsx` - Component for displaying score history
4. `src/app/_components/user/ProfileHeader.tsx` - Component for the profile header

### API Endpoints to Add

1. Add to `src/server/api/routers/participant.ts`:
   - `getParticipantWithScores` - Fetch participant data with their scores
   - `getParticipantRank` - Get the participant's overall rank

### Database Queries

No schema changes are needed. We'll use the existing models:

- `Participant` - For user information
- `Score` - For score data
- `Event` - For event information

Create a query that joins these tables to get comprehensive participant data.

### UI/UX Considerations

- Use consistent styling with the rest of the application
- Implement responsive design for mobile and desktop views
- Use the existing Greek-themed styling (colors, fonts, etc.)
- Add loading states and error handling
- Ensure accessibility compliance

## Implementation Steps

1. **Create the Profile Page Structure**

   - Set up the dynamic route for `/profile/[id]`
   - Create server and client components

2. **Implement the API Endpoints**

   - Add new procedures to the participant router
   - Create queries to fetch profile data with scores

3. **Build the UI Components**

   - Create the profile header component
   - Implement the score history table
   - Build the edit profile functionality (for self-view)

4. **Add Navigation**

   - Update the leaderboard to link to profiles
   - Add profile links throughout the application

5. **Testing**
   - Test both self-view and other-view scenarios
   - Verify data accuracy and permissions
   - Test on different devices and screen sizes

## Example Code Snippets

### Profile Page Route

```tsx
// src/app/profile/[id]/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { HydrateClient } from "~/trpc/server";
import ProfileContent from "./profileContent";
import { redirect } from "next/navigation";

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
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

  // Fetch initial profile data
  // This will be hydrated on the client side

  return (
    <HydrateClient>
      <ProfileContent profileId={params.id} currentUser={user} />
    </HydrateClient>
  );
}
```

### Score History Component

```tsx
// src/app/_components/user/ScoreHistory.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface ScoreHistoryProps {
  participantId: string;
}

export const ScoreHistory = ({ participantId }: ScoreHistoryProps) => {
  const { data, isLoading, error } =
    api.participant.getParticipantWithScores.useQuery({
      participantId,
    });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">Loading score history...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400">Error loading scores: {error.message}</div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-xl font-bold">Event History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          {/* Table implementation */}
        </table>
      </div>
    </div>
  );
};
```

## Success Criteria

- Users can view their own profile with editing capabilities
- Users can view other participants' profiles in read-only mode
- The score breakdown table accurately displays event performance
- Navigation to profiles is intuitive and accessible
- The UI is consistent with the rest of the application
- The page is responsive and works on all device sizes
