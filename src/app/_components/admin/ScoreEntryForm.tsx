"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * Form component for admin to enter scores for participants in events
 * Only visible to admin users
 */
export const ScoreEntryForm = () => {
  // Form state
  const [eventId, setEventId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [scoreType, setScoreType] = useState<"rank" | "points">("rank");
  const [rank, setRank] = useState<number>(1);
  const [points, setPoints] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch events data
  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = api.event.getAll.useQuery();

  // Fetch participants data
  const {
    data: participants,
    isLoading: participantsLoading,
    error: participantsError,
  } = api.participant.getAll.useQuery();

  // Score update mutation
  const updateScoreMutation = api.score.updateScore.useMutation({
    onSuccess: (data) => {
      setMessage({ text: "Score updated successfully", type: "success" });
      setIsSubmitting(false);
      // Optionally reset form
      setRank(1);
    },
    onError: (error) => {
      setMessage({ text: error.message, type: "error" });
      setIsSubmitting(false);
    },
  });

  /**
   * Handles form submission to update a score
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Validate inputs
    if (!eventId || !participantId) {
      setMessage({
        text: "Please select an event and participant",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    if (scoreType === "rank" && !rank) {
      setMessage({
        text: "Please enter a rank",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    if (scoreType === "points" && points === undefined) {
      setMessage({
        text: "Please enter points",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    // Submit score update
    updateScoreMutation.mutate({
      eventId,
      participantId,
      scoreType,
      rank: scoreType === "rank" ? rank : undefined,
      points: scoreType === "points" ? points : undefined,
    });
  };

  // Show loading state while fetching data
  if (eventsLoading || participantsLoading) {
    return (
      <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
        <h2 className="mb-4 text-2xl font-bold text-white">Update Scores</h2>
        <p className="text-gray-300">Loading...</p>
      </div>
    );
  }

  // Show error state if data fetching failed
  if (eventsError || participantsError) {
    return (
      <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
        <h2 className="mb-4 text-2xl font-bold text-white">Update Scores</h2>
        <p className="text-red-400">
          {eventsError
            ? "Failed to load events"
            : "Failed to load participants"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold text-white">Update Scores</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Selection */}
        <div>
          <label
            htmlFor="event"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            Event
          </label>
          <select
            id="event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            required
          >
            <option value="" disabled>
              Select an event
            </option>
            {events?.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {/* Participant Selection */}
        <div>
          <label
            htmlFor="participant"
            className="mb-1 block text-sm font-medium text-gray-200"
          >
            Participant
          </label>
          <select
            id="participant"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            required
          >
            <option value="" disabled>
              Select a participant
            </option>
            {participants?.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name || "Anonymous"}
              </option>
            ))}
          </select>
        </div>

        {/* Score Type Selection */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-200">
            Score Type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="scoreType"
                value="rank"
                checked={scoreType === "rank"}
                onChange={() => setScoreType("rank")}
                className="mr-2"
              />
              <span className="text-sm text-gray-200">Rank-based</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="scoreType"
                value="points"
                checked={scoreType === "points"}
                onChange={() => setScoreType("points")}
                className="mr-2"
              />
              <span className="text-sm text-gray-200">Direct Points</span>
            </label>
          </div>
        </div>

        {/* Rank Input - Only shown when scoreType is "rank" */}
        {scoreType === "rank" && (
          <div>
            <label
              htmlFor="rank"
              className="mb-1 block text-sm font-medium text-gray-200"
            >
              Rank (1-14)
            </label>
            <input
              id="rank"
              type="number"
              min="1"
              max="14"
              value={rank}
              onChange={(e) => setRank(parseInt(e.target.value))}
              className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Points will be calculated as (15 - rank)
            </p>
          </div>
        )}

        {/* Points Input - Only shown when scoreType is "points" */}
        {scoreType === "points" && (
          <div>
            <label
              htmlFor="points"
              className="mb-1 block text-sm font-medium text-gray-200"
            >
              Points
            </label>
            <input
              id="points"
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value))}
              className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full rounded-md px-4 py-2 font-medium transition-colors ${
            isSubmitting
              ? "cursor-not-allowed bg-purple-400"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {isSubmitting ? "Updating Score..." : "Update Score"}
        </button>
      </form>

      {/* Success/Error Message */}
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
