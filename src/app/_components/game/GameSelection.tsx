"use client";

import { api, type RouterOutputs } from "~/trpc/react";

type GameWithParticipants = RouterOutputs["game"]["getActiveGames"][number];

interface GameSelectionProps {
  onJoinGame: (gameId: string) => void;
  onCreateGame: () => void;
}

export const GameSelection: React.FC<GameSelectionProps> = ({
  onJoinGame,
  onCreateGame,
}) => {
  const {
    data: activeGames,
    isLoading,
    error,
    refetch,
  } = api.game.getActiveGames.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds to update the list
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
        <span className="ml-3 text-lg text-gray-300">Loading games...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-red-400">
        <p className="text-lg">Error loading games: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">
          Join an Existing Game
        </h2>
        {activeGames && activeGames.length > 0 ? (
          <ul className="max-h-60 space-y-3 overflow-y-auto rounded-md border border-gray-700 bg-gray-800 p-4">
            {activeGames.map((game: GameWithParticipants) => (
              <li
                key={game.id}
                className="bg-gray-750 flex items-center justify-between rounded-md p-3 shadow"
              >
                <div>
                  <p className="font-medium text-white">
                    Game ID: {game.id.substring(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-400">
                    Players: {game.participants.length}
                  </p>
                </div>
                <button
                  onClick={() => onJoinGame(game.id)}
                  className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-400">
            No active games found. Why not create one?
          </p>
        )}
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Or Create Your Own
        </h2>
        <button
          onClick={onCreateGame}
          className="w-full rounded bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700"
        >
          Create New Game
        </button>
      </div>
    </div>
  );
};
