"use client";

import { useState } from "react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isDisabled: boolean;
}

export const MessageInput = ({
  onSendMessage,
  isDisabled,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() === "" || isDisabled) return;

    onSendMessage(message.trim());
    setMessage("");
    setIsTyping(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.trim() !== "");
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <form onSubmit={handleSubmit} className="flex items-center">
        <input
          type="text"
          value={message}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={
            isDisabled
              ? "Sign in to send messages"
              : "Type your message here..."
          }
          className="focus:border-greek-gold/50 focus:ring-greek-gold/50 flex-1 rounded-l-md border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-gray-400 focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDisabled || message.trim() === ""}
          className="bg-greek-blue hover:bg-greek-blue-light rounded-r-md border border-l-0 border-white/20 px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {isTyping && !isDisabled && (
        <div className="mt-2 text-xs text-gray-400">
          <span className="animate-pulse">●</span> Typing...
        </div>
      )}
    </div>
  );
};
