"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface GameParticipant {
  id: string;
  participantId: string;
  tapCount: number;
  rank?: number | null;
  scoreAwarded?: number | null;
  participant: {
    id: string;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
}

interface GameResultsProps {
  gameId: string;
  participants: GameParticipant[];
  onPlayAgain: () => void;
}

/**
 * Displays the final rankings and scores after a game is finished
 */
export const GameResults: React.FC<GameResultsProps> = ({
  gameId,
  participants,
  onPlayAgain,
}) => {
  const [showingDetails, setShowingDetails] = useState(false);

  // Sort participants by rank
  const sortedParticipants = [...participants].sort((a, b) => {
    // If ranks are available, sort by rank
    if (
      a.rank !== null &&
      b.rank !== null &&
      a.rank !== undefined &&
      b.rank !== undefined
    ) {
      return a.rank - b.rank;
    }
    // Otherwise sort by tap count
    return (b.tapCount || 0) - (a.tapCount || 0);
  });

  // Get the winner (first place)
  const winner = sortedParticipants[0];

  // Get medal emoji based on rank
  const getMedalEmoji = (rank: number | null | undefined) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-2 text-2xl font-bold text-white">Game Results</h2>

      {/* Winner celebration */}
      {winner && (
        <div className="mb-6 text-center">
          <div className="mb-2 text-lg text-gray-300">
            <span className="text-2xl">🏆</span> Winner
          </div>
          <div className="mb-4 flex flex-col items-center">
            <div className="border-greek-gold relative mb-2 h-16 w-16 overflow-hidden rounded-full border-4">
              <Image
                src={winner.participant.avatarUrl ?? "/default-avatar.png"}
                alt={winner.participant.name ?? "Winner"}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-xl font-bold text-white">
              {winner.participant.name ?? "Anonymous Player"}
            </div>
            <div className="text-sm text-gray-400">
              {winner.participant.email}
            </div>
            <div className="text-greek-gold mt-2 text-lg font-bold">
              {winner.tapCount} taps
            </div>
            {winner.scoreAwarded && (
              <div className="mt-1 rounded-full bg-green-900 px-3 py-1 text-sm font-medium text-green-300">
                +{winner.scoreAwarded} points
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="mb-6 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Player
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-300 uppercase">
                Taps
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-300 uppercase">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedParticipants.map((participant) => (
              <tr
                key={participant.id}
                className={
                  participant.rank === 1
                    ? "bg-greek-gold/10"
                    : participant.rank === 2
                      ? "bg-gray-500/10"
                      : participant.rank === 3
                        ? "bg-greek-terracotta/10"
                        : ""
                }
              >
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="mr-1 text-lg">
                      {getMedalEmoji(participant.rank)}
                    </span>
                    <span className="font-medium text-white">
                      {participant.rank ?? "-"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="mr-3 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={
                          participant.participant.avatarUrl ??
                          "/default-avatar.png"
                        }
                        alt={participant.participant.name ?? "Player"}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {participant.participant.name ?? "Anonymous Player"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {participant.participant.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap text-white">
                  {participant.tapCount}
                </td>
                <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                  {participant.scoreAwarded ? (
                    <span className="font-medium text-green-400">
                      +{participant.scoreAwarded}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Game details toggle */}
      <button
        onClick={() => setShowingDetails(!showingDetails)}
        className="mb-4 text-sm text-gray-400 hover:text-white"
      >
        {showingDetails ? "Hide Details" : "Show Details"} ▾
      </button>

      {/* Game details */}
      {showingDetails && (
        <div className="mb-6 w-full rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm">
          <div className="mb-2 flex justify-between">
            <span className="text-gray-400">Game ID:</span>
            <span className="font-mono text-white">{gameId}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span className="text-gray-400">Players:</span>
            <span className="text-white">{participants.length}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span className="text-gray-400">Total Taps:</span>
            <span className="text-white">
              {participants.reduce(
                (sum, participant) => sum + (participant.tapCount || 0),
                0,
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Points Awarded:</span>
            <span className="text-white">
              {participants.reduce(
                (sum, participant) => sum + (participant.scoreAwarded ?? 0),
                0,
              )}
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex w-full flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
        <button
          onClick={onPlayAgain}
          className="bg-greek-blue hover:bg-greek-blue-light flex-1 rounded-md px-4 py-3 font-bold text-white transition-colors"
        >
          Play Again
        </button>
        <Link
          href="/olympics"
          className="flex-1 rounded-md border border-gray-600 bg-gray-700 px-4 py-3 text-center font-bold text-white transition-colors hover:bg-gray-600"
        >
          Back to Olympics
        </Link>
      </div>
    </div>
  );
};
