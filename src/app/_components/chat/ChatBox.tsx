"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { createBrowserClient } from "~/lib/supabase/client";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { User } from "@supabase/supabase-js";

// Define the Message interface
interface Message {
  id: string;
  content: string;
  createdAt: Date;
  participant: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface ChatBoxProps {
  user: User | null;
}

export const ChatBox = ({ user }: ChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [supabase] = useState(() => createBrowserClient());

  // Query to fetch initial messages
  const { data, isLoading } = api.message.getMessages.useQuery({
    limit: 50,
  });

  // Get tRPC context for invalidation
  const utils = api.useContext();

  // Mutation to send a message
  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: (newMessage) => {
      // Optimistically add the new message to the UI
      // This will make the UI update immediately without waiting for the real-time update
      setMessages((prevMessages) => [...prevMessages, newMessage]);
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
        // Get the new message ID from the payload
        const newMessageId = payload.new.id as string;

        // Fetch just the new message with participant data
        void utils.message.getMessage
          .fetch({
            messageId: newMessageId,
          })
          .then((newMessageData) => {
            if (newMessageData) {
              // Add the new message to the existing messages array
              setMessages((prevMessages) => [...prevMessages, newMessageData]);
            }
          })
          .catch((error) => {
            console.error("Error handling new message:", error);

            // Fallback: fetch all messages if there's an error
            void utils.message.getMessages
              .fetch({ limit: 50 })
              .then((result) => {
                if (result?.messages) {
                  setMessages(result.messages);
                }
              });
          });
      },
    );

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, utils]);

  const handleSendMessage = (content: string) => {
    if (!user) return;

    void sendMessageMutation.mutate({
      content,
    });
  };

  return (
    <div className="border-greek-gold/30 flex h-[500px] flex-col rounded-lg border bg-white/10 p-4 shadow-md">
      <h2 className="greek-column-header mb-4 flex items-center text-2xl font-bold">
        <span className="mr-2">💬</span> Olympic Chat
      </h2>

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} isDisabled={!user} />
    </div>
  );
};
