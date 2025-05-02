"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

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

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList = ({ messages, isLoading }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
        <p className="text-gray-300">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-300">
          No messages yet. Be the first to say hello!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        // Format the timestamp
        const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={message.id} className="flex items-start">
            <div className="mr-3 flex-shrink-0">
              <Image
                src={message.participant.avatarUrl ?? "/default-avatar.png"}
                alt={message.participant.name ?? "Anonymous"}
                className="rounded-full border-2 border-white/20 object-cover"
                width={40}
                height={40}
                onError={(e) => {
                  // Handle image load error
                  (e.target as HTMLImageElement).src = "/default-avatar.png";
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline">
                <span className="mr-2 font-semibold text-white">
                  {message.participant.name ?? "Anonymous"}
                </span>
                <span className="text-xs text-gray-400">{timestamp}</span>
              </div>
              <div className="mt-1 rounded-md bg-white/10 p-3 text-sm">
                {message.content}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
