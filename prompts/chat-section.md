# Chat Section Feature

## Overview

Implement a real-time chat section that allows participants to communicate with each other. This feature will replace the current profile section in the Olympics page with an interactive messaging interface.

## Requirements

### 1. Chat Interface

- Create a real-time messaging interface for participants
- Replace the current profile section in the Olympics page
- Support text-based messages with timestamps
- Display participant names and avatars with messages
- Implement auto-scrolling to the latest messages

### 2. Message Persistence

- Store messages in a database for persistence
- Load message history when a user opens the chat
- Implement pagination for older messages
- Ensure messages are associated with the correct sender

### 3. Real-time Updates

- Implement real-time message delivery using Supabase's real-time capabilities
- Show typing indicators when participants are composing messages
- Display notifications for new messages
- Update the UI immediately when new messages arrive

### 4. Authentication and Security

- Only allow authenticated users to send messages
- Prevent users from impersonating others
- Implement basic content moderation (e.g., message length limits)
- Add reporting functionality for inappropriate messages

## Technical Implementation

### Database Schema Changes

Add a new `Message` table to the database:

```prisma
model Message {
  id            String      @id @default(uuid())
  content       String
  participantId String      @map("participant_id")
  createdAt     DateTime    @default(now()) @map("created_at")

  participant   Participant @relation(fields: [participantId], references: [id])

  @@map("messages")
}
```

Update the `Participant` model to include the relation:

```prisma
model Participant {
  // existing fields...
  messages      Message[]
}
```

### New Files to Create

1. `src/app/_components/chat/ChatBox.tsx` - Main chat interface component
2. `src/app/_components/chat/MessageList.tsx` - Component to display messages
3. `src/app/_components/chat/MessageInput.tsx` - Component for composing messages
4. `src/server/api/routers/message.ts` - TRPC router for message operations

### API Endpoints to Add

1. Create a new message router with the following procedures:

   - `getMessages` - Fetch recent messages with pagination
   - `sendMessage` - Create a new message
   - `reportMessage` - Report inappropriate content

2. Set up Supabase real-time subscription for the messages table

### UI/UX Considerations

- Design a clean, intuitive chat interface
- Use the existing Greek-themed styling
- Ensure responsive design for all device sizes
- Implement loading states and error handling
- Add visual cues for new messages and notifications
- Ensure accessibility compliance

## Implementation Steps

1. **Database Setup**

   - Create the new Message model in the Prisma schema
   - Run migrations to update the database

2. **Backend Implementation**

   - Create the message router with necessary procedures
   - Set up authentication checks for message operations
   - Implement real-time subscription handling

3. **Frontend Components**

   - Create the ChatBox component to replace the profile section
   - Implement MessageList for displaying messages
   - Build MessageInput for composing and sending messages

4. **Real-time Functionality**

   - Set up Supabase channel subscription for real-time updates
   - Implement handlers for new message events
   - Add typing indicators and notifications

5. **Testing and Refinement**
   - Test the chat functionality with multiple users
   - Verify real-time updates and message persistence
   - Optimize performance for large message volumes

## Example Code Snippets

### Message Router

```typescript
// src/server/api/routers/message.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

export const messageRouter = createTRPCRouter({
  getMessages: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const messages = await db.message.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
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
      });

      let nextCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Find the participant record for this user
      const participant = await db.participant.findUnique({
        where: {
          userId,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be a participant to send messages",
        });
      }

      // Create the message
      const message = await db.message.create({
        data: {
          content: input.content,
          participantId: participant.id,
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
      });

      return message;
    }),
});
```

### ChatBox Component

```tsx
// src/app/_components/chat/ChatBox.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { createBrowserClient } from "~/lib/supabase/client";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export const ChatBox = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [supabase] = useState(() => createBrowserClient());
  const messagesEndRef = useRef(null);

  // Query to fetch initial messages
  const { data, isLoading } = api.message.getMessages.useQuery({
    limit: 50,
  });

  // Get tRPC context for invalidation
  const utils = api.useContext();

  // Mutation to send a message
  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      // No need to invalidate as we'll get the message via real-time
    },
  });

  // Set up initial messages when data loads
  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages);
    }
  }, [data]);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel("public:messages").on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        // Fetch the complete message with participant data
        void utils.message.getMessages.fetch().then((data) => {
          if (data?.messages) {
            setMessages(data.messages);
          }
        });
      },
    );

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, utils]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (content) => {
    if (!user) return;

    void sendMessageMutation.mutate({
      content,
    });
  };

  return (
    <div className="border-greek-gold/30 flex h-[500px] flex-col rounded-lg border bg-white/10 p-4 shadow-md">
      <h2 className="mb-4 flex items-center text-2xl font-bold">
        <span className="mr-2">💬</span> Olympic Chat
      </h2>

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} isDisabled={!user} />
    </div>
  );
};
```

### Integration with Olympics Page

```tsx
// Modified section in src/app/olympics/olympicsContent.tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {/* Leaderboard */}
  <div className="border-greek-gold/30 rounded-lg border bg-white/10 p-6 shadow-md">
    {/* Existing leaderboard code */}
  </div>

  {/* Events */}
  <div className="border-greek-gold/30 rounded-lg border bg-white/10 p-6 shadow-md">
    {/* Existing events code */}
  </div>

  {/* Chat Section - Replacing the User Profile */}
  <ChatBox user={user} />
</div>
```

## Success Criteria

- Real-time chat functionality is working correctly
- Messages persist and load properly when the page is refreshed
- User avatars and names are displayed with messages
- Only authenticated users can send messages
- The UI is responsive and works on all device sizes
- The chat interface is intuitive and easy to use
- Performance remains good even with many messages
