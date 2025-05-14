"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";

interface Participant {
  id: string;
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
}

interface GameLobbyProps {
  gameId: string;
  participants: Participant[];
  isCreator: boolean;
  onStartGame: () => void;
}

/**
 * The waiting room for players to join before the game starts
 */
export const GameLobby: React.FC<GameLobbyProps> = ({
  gameId,
  participants,
  isCreator,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);
  const gameUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/olympics?game=${gameId}`
      : "";

  // Copy game URL to clipboard
  const copyGameUrl = () => {
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Start the game (only available to the creator)
  const handleStartGame = () => {
    if (isCreator) {
      onStartGame();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-2 text-2xl font-bold text-white">Game Lobby</h2>
      <p className="mb-6 text-center text-gray-300">
        Waiting for players to join...
      </p>

      {/* Game URL sharing */}
      <div className="mb-6 w-full rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="mb-2 text-sm text-gray-400">
          Share this link with friends:
        </div>
        <div className="flex items-center">
          <input
            type="text"
            value={gameUrl}
            readOnly
            className="flex-1 rounded-l-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
          />
          <button
            onClick={copyGameUrl}
            className="rounded-r-md border border-l-0 border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Participants list */}
      <div className="mb-8 w-full rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Players ({participants.length})
        </h3>
        <ul className="space-y-2">
          {participants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center rounded-md bg-gray-700 p-2"
            >
              <div className="mr-3 h-8 w-8 overflow-hidden rounded-full border border-gray-600">
                <Image
                  src={participant.avatarUrl ?? "/default-avatar.png"}
                  alt={participant.name ?? "Player"}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">
                  {participant.name ?? "Anonymous Player"}
                </div>
                <div className="text-xs text-gray-400">{participant.email}</div>
              </div>
              {isCreator && participant.id === participants[0]?.id && (
                <div className="rounded-full bg-green-900 px-2 py-1 text-xs font-medium text-green-300">
                  Host
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Start game button (only for creator) */}
      {isCreator ? (
        <button
          onClick={handleStartGame}
          disabled={participants.length < 1}
          className="w-full rounded-md bg-green-600 px-4 py-3 font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Game
        </button>
      ) : (
        <div className="text-center text-gray-400">
          Waiting for the host to start the game...
        </div>
      )}
    </div>
  );
};
