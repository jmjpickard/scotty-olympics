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
            <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
              Rank
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
              Athlete
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium tracking-wider text-gray-300 uppercase">
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
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  {medalEmoji} {score.rank}
                </td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
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
                <td className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap">
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
