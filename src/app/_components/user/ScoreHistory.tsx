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

  // Sort options
  const [sortField, setSortField] = useState<"date" | "rank" | "points">(
    "date",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: "date" | "rank" | "points") => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default direction
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc"); // Lower rank is better, so default asc
    }
  };

  // Sort the scores based on current sort settings
  const sortedScores = data?.scores
    ? [...data.scores].sort((a, b) => {
        let comparison = 0;

        if (sortField === "date") {
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortField === "rank") {
          comparison = a.rank - b.rank;
        } else if (sortField === "points") {
          comparison = a.points - b.points;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      })
    : [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
          <p className="text-gray-300">Loading score history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-900/20 p-4 text-center">
        <p className="font-medium text-red-300">Error loading scores</p>
        <p className="mt-2 text-sm text-red-400">{error.message}</p>
      </div>
    );
  }

  if (!data?.scores?.length) {
    return (
      <div className="rounded-md border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
        <p className="text-lg font-medium text-yellow-300">No Event History</p>
        <p className="mt-2 text-yellow-400">
          This participant hasn&apos;t competed in any events yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-xl font-bold">Event History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr className="bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Event
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase"
                onClick={() => handleSort("date")}
              >
                Date
                {sortField === "date" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-300 uppercase"
                onClick={() => handleSort("rank")}
              >
                Rank
                {sortField === "rank" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-300 uppercase"
                onClick={() => handleSort("points")}
              >
                Points
                {sortField === "points" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedScores.map((score) => {
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
                  key={score.eventId}
                  className={`transition hover:bg-white/5 ${medalClass}`}
                >
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {score.event.name}
                    {score.event.description && (
                      <p className="mt-1 text-xs text-gray-400">
                        {score.event.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {new Date(score.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center text-sm whitespace-nowrap">
                    {medalEmoji} {score.rank}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
                    {score.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
