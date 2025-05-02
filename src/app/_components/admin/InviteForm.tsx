"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * Form component for admin to invite new participants
 * Sends an email invitation and creates a participant record in the database
 */
export const InviteForm = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const inviteMutation = api.admin.inviteParticipant.useMutation({
    onSuccess: (data) => {
      setMessage({ text: data.message, type: "success" });
      setEmail("");
      setIsSubmitting(false);
    },
    onError: (error) => {
      setMessage({ text: error.message, type: "error" });
      setIsSubmitting(false);
    },
  });

  /**
   * Handles form submission to invite a participant
   * Validates email before sending invitation
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    inviteMutation.mutate({ email });
  };

  return (
    <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold text-white">Invite Participant</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="participant@example.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full rounded-md px-4 py-2 font-medium transition-colors ${
            isSubmitting
              ? "cursor-not-allowed bg-purple-400"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 rounded p-3 ${
            message.type === "success" ? "bg-green-500/30" : "bg-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};
