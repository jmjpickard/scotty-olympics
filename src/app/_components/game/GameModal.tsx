"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import type { SetStateAction } from "react";

// Define types for game data
// This interface should match the flattened structure returned by game.getGame
interface GameParticipantFromApi {
  id: string; // This is GameParticipant.id from Prisma
  gameId: string;
  participantId: string; // This is the actual Participant.id from Prisma
  tapCount: number;
  rank?: number | null;
  scoreAwarded?: number | null;
  name?: string | null; // Direct property
  email: string; // Direct property
  avatarUrl?: string | null; // Direct property
}

interface Game {
  id: string;
  status: "waiting" | "starting" | "in_progress" | "finished";
  startedAt?: string;
  participants: GameParticipantFromApi[]; // Use the updated interface
  // Add other game properties as needed
}
import { GameSelection } from "./GameSelection"; // Added
import { GameLobby } from "./GameLobby";
import { GameCountdown } from "./GameCountdown";
import { GamePlay } from "./GamePlay";
import { GameResults } from "./GameResults";

interface GameModalProps {
  onClose: () => void;
  initialGameId?: string;
  _userId: string; // Prefixed with underscore to indicate intentionally unused
  participantId: string;
}

type GameState =
  | "gameSelection" // Added
  | "creating"
  | "lobby"
  | "countdown"
  | "synchronizing"
  | "playing"
  | "results";

/**
 * The main container for the "Row Harder!" game
 * Manages game state and transitions between different game phases
 */
export const GameModal: React.FC<GameModalProps> = ({
  onClose,
  initialGameId,
  _userId,
  participantId,
}) => {
  const [gameState, setGameState] = useState<GameState>(
    initialGameId ? "lobby" : "gameSelection", // Changed initial state
  );
  const [gameId, setGameId] = useState<string | undefined>(initialGameId);
  const [_tapCount, setTapCount] = useState(0); // Local tap count, GamePlay has its own for display
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(10000); // 10 seconds in ms
  const [isFinished, setIsFinished] = useState(false);
  const lastRefetchTimeRef = useRef<number>(0);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Create a new game
  const createGameMutation = api.game.createGame.useMutation({
    onSuccess: (data: { id: string }) => {
      setGameId(data.id);
      setGameState("lobby");
    },
  });

  // Join an existing game
  const joinGameMutation = api.game.joinGame.useMutation();

  // Start a game
  const startGameMutation = api.game.startGame.useMutation({
    onSuccess: (data: { startedAt: Date | null }) => {
      // Changed from string to Date | null
      if (data.startedAt) {
        setStartTime(new Date(data.startedAt)); // Ensure it's a Date object
        setGameState("countdown");
      }
    },
  });

  // Update tap count
  const updateTapCountMutation = api.game.updateTapCount.useMutation();

  // Finish a game
  const finishGameMutation = api.game.finishGame.useMutation({
    onSuccess: () => {
      setIsFinished(true);
      setGameState("results");
    },
  });

  // Get game data
  const {
    data: gameData,
    isLoading: isLoadingGame,
    refetch: refetchGame,
  } = api.game.getGame.useQuery(
    { gameId: gameId ?? "" },
    {
      enabled: !!gameId && gameId.length > 0,
      refetchInterval: false, // Polling handled by dedicated useEffect
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  ) as {
    data: Game | undefined;
    isLoading: boolean;
    refetch: () => Promise<unknown>;
  };

  // Create a new game on initial mount if no initialGameId is provided
  // This handles the scenario where the modal is opened to start a fresh game, not join one.
  // This useEffect is now primarily for the "creating" loading state after "Create New Game" is clicked.
  useEffect(() => {
    if (
      gameState === "creating" && // Only when explicitly in "creating" state
      !gameId &&
      createGameMutation.status !== "pending" &&
      !createGameMutation.isSuccess // Ensure it doesn't re-trigger if already successful from a previous action
    ) {
      createGameMutation.mutate();
    }
  }, [gameState, gameId, createGameMutation]);

  // Join game if initialGameId is provided - only once
  const joinedRef = useRef(false);

  useEffect(() => {
    if (initialGameId && gameState === "lobby" && !joinedRef.current) {
      joinedRef.current = true;
      joinGameMutation.mutate({ gameId: initialGameId });
    }
  }, [initialGameId, gameState, joinGameMutation]);

  // Handle countdown completion
  const handleCountdownComplete = () => {
    // Client-side countdown is done.
    // Transition to "synchronizing" state and wait for server to confirm game is "in_progress".
    setGameState("synchronizing");
  };

  // Handle tap count update
  const handleUpdateTapCount = (count: number) => {
    // setTapCount(count); // GameModal's tapCount state isn't critical; GamePlay manages its own for display and passes it here.
    // Only send updates if the game is actively playing on the client and not yet marked as finished.
    if (gameId && gameState === "playing" && !isFinished) {
      updateTapCountMutation.mutate({
        gameId,
        tapCount: count,
      });
    }
  };

  // Handle start game
  const handleStartGame = () => {
    if (gameId) {
      startGameMutation.mutate({ gameId });
    }
  };

  // Handle joining a game from the selection screen
  const handleJoinSelectedGame = (selectedGameId: string) => {
    setGameId(selectedGameId); // Set the gameId first
    // joinGameMutation will be called by the useEffect that listens to initialGameId/gameId changes
    // For direct join, we need to ensure the mutation is called and then transition.
    joinGameMutation.mutate(
      { gameId: selectedGameId },
      {
        onSuccess: () => {
          setGameState("lobby");
        },
        onError: (error) => {
          // Handle potential errors, e.g., game no longer available
          console.error("Failed to join game:", error);
          setGameState("gameSelection"); // Go back to selection on error
          // Optionally, display an error message to the user
        },
      },
    );
  };

  // Handle creating a new game from the selection screen
  const handleCreateNewGame = () => {
    // Reset relevant states before creating a new game
    setGameId(undefined);
    createGameMutation.reset();
    joinGameMutation.reset();
    startGameMutation.reset();
    updateTapCountMutation.reset();
    finishGameMutation.reset();

    setTapCount(0);
    setStartTime(null);
    setTimeRemaining(10000);
    setIsFinished(false);
    joinedRef.current = false;
    lastRefetchTimeRef.current = 0;
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    setGameState("creating"); // Transition to "creating" state, useEffect will trigger mutation
  };

  // Handle play again
  const handlePlayAgain = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    // Reset mutation states for the new game cycle
    createGameMutation.reset();
    joinGameMutation.reset();
    startGameMutation.reset();
    updateTapCountMutation.reset();
    finishGameMutation.reset();

    setGameState("creating");
    setTapCount(0);
    setStartTime(null);
    setTimeRemaining(10000);
    setIsFinished(false);
    joinedRef.current = false;
    lastRefetchTimeRef.current = 0;

    // Explicitly set gameId to undefined before setting gameState to "creating",
    // to ensure any effects relying on gameId being undefined for creation work correctly.
    setGameId(undefined);
    // setGameState("creating"); // This will be handled by the createGameMutation.onSuccess

    // "Play Again" always means creating a brand new game.
    // The existing createGameMutation.mutate() call will set gameId and transition to lobby on success.
    if (createGameMutation.status !== "pending") {
      createGameMutation.mutate(); // onSuccess will set gameId and setGameState("lobby")
    }
  };

  // Check if current user is the game creator
  const isCreator =
    gameData?.participants?.[0]?.participantId === participantId;

  // Render different content based on game state
  const renderContent = () => {
    if (isLoadingGame && gameId) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
          <span className="ml-3 text-lg text-gray-300">Loading game...</span>
        </div>
      );
    }

    switch (gameState) {
      case "gameSelection": // Added case
        return (
          <GameSelection
            onJoinGame={handleJoinSelectedGame}
            onCreateGame={handleCreateNewGame}
          />
        );
      case "creating":
        return (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
            <span className="ml-3 text-lg text-gray-300">Creating game...</span>
          </div>
        );
      case "lobby":
        return (
          <GameLobby
            gameId={gameId ?? ""}
            participants={
              gameData?.participants
                ? gameData.participants.map((gp) => ({
                    id: gp.participantId, // GameLobby expects participant's actual ID as 'id'
                    name: gp.name,
                    email: gp.email,
                    avatarUrl: gp.avatarUrl,
                    // tapCount is not used by GameLobby directly
                  }))
                : []
            }
            isCreator={isCreator}
            onStartGame={handleStartGame}
          />
        );
      case "countdown":
        return (
          <GameCountdown
            onComplete={handleCountdownComplete}
            startTime={startTime ?? new Date()}
          />
        );
      case "synchronizing":
        return (
          <div className="flex h-64 flex-col items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
            <span className="mt-3 ml-3 text-lg text-gray-300">
              Starting game, please wait...
            </span>
          </div>
        );
      case "playing":
        return (
          <GamePlay
            gameId={gameId ?? ""}
            isActive={gameState === "playing" && timeRemaining > 0}
            onUpdateTapCount={handleUpdateTapCount}
            timeRemaining={timeRemaining}
          />
        );
      case "results":
        return (
          <GameResults
            gameId={gameId ?? ""}
            participants={
              gameData?.participants
                ? gameData.participants.map((gp) => ({
                    // Transform to the nested structure GameResults expects
                    id: gp.id, // GameParticipant.id
                    participantId: gp.participantId, // Participant.id
                    tapCount: gp.tapCount,
                    rank: gp.rank,
                    scoreAwarded: gp.scoreAwarded,
                    participant: {
                      id: gp.participantId, // Participant.id
                      name: gp.name,
                      email: gp.email,
                      avatarUrl: gp.avatarUrl,
                    },
                  }))
                : []
            }
            onPlayAgain={handlePlayAgain}
          />
        );
      default:
        return null;
    }
  };

  // Update game state based on game data
  useEffect(() => {
    if (gameData) {
      // If game is waiting and we are not already in lobby or game selection (e.g. after creation)
      if (
        gameData.status === "waiting" &&
        gameState !== "lobby" &&
        gameState !== "gameSelection" // Don't force out of game selection if just polling
      ) {
        // Only transition to lobby if we have a gameId, implying we've joined or created.
        // If gameId is not set, and we are in "gameSelection", stay there.
        if (gameId) {
          setGameState("lobby");
        }
      } else if (
        gameData.status === "starting" &&
        gameState !== "countdown" &&
        gameState !== "synchronizing" &&
        gameState !== "playing" &&
        gameData.startedAt
      ) {
        setStartTime(new Date(gameData.startedAt));
        setGameState("countdown");
      } else if (
        gameData.status === "in_progress" &&
        (gameState === "lobby" ||
          gameState === "countdown" ||
          gameState === "synchronizing") &&
        !isFinished
      ) {
        setGameState("playing");
      } else if (
        gameData.status === "finished" &&
        gameState !== "results" &&
        !isFinished
      ) {
        setIsFinished(true);
        setGameState("results");
        if (gameTimerRef.current) {
          clearInterval(gameTimerRef.current);
          gameTimerRef.current = null;
        }
      }
    }
  }, [gameData, gameState, isFinished, gameId]); // Added gameId to dependencies

  // Effect to manage the 10-second game timer
  useEffect(() => {
    if (gameState === "playing" && !gameTimerRef.current) {
      setTimeRemaining(10000); // Reset timer to full duration

      const gameEndTime = Date.now() + 10000;
      gameTimerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, gameEndTime - now);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          if (gameTimerRef.current) clearInterval(gameTimerRef.current);
          gameTimerRef.current = null;

          if (
            gameId &&
            !isFinished && // Check current isFinished state before optimistic update
            finishGameMutation.status !== "pending" &&
            finishGameMutation.status !== "success"
          ) {
            // Optimistically update client state to prevent further tap submissions
            // before the mutation completes. This ensures that any immediate subsequent
            // calls to handleUpdateTapCount will see the game as finished.
            setIsFinished(true);
            setGameState("results");

            // Now call the mutation. The onSuccess callback will affirm these states.
            finishGameMutation.mutate({ gameId });
          }
        }
      }, 100);
    } else if (gameState !== "playing" && gameTimerRef.current) {
      // This handles cases where gameState changes from 'playing' for other reasons
      // (e.g., server forces finish, or component unmounts while playing)
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    return () => {
      // Cleanup on component unmount
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    };
  }, [gameState, gameId, isFinished, finishGameMutation]);

  // Poll for game updates during gameplay - with safeguards
  // This is mainly for updating participant scores/data during active play or countdown.
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | undefined;
    const pollFrequency = 2000; // Poll every 2 seconds

    // Poll if we have a gameId, the game is in an active state, and the client doesn't think it's finished yet.
    if (
      gameId &&
      !isFinished &&
      (gameState === "lobby" ||
        gameState === "countdown" ||
        gameState === "synchronizing" ||
        gameState === "playing")
    ) {
      pollInterval = setInterval(() => {
        if (!isLoadingGame) {
          // No need to manage lastRefetchTimeRef.current here,
          // setInterval handles the frequency, and isLoadingGame prevents overlap.
          void refetchGame();
        }
      }, pollFrequency);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [gameState, gameId, isFinished, refetchGame, isLoadingGame]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-white">
            <span className="mr-2">🚣</span> Row Harder!
          </h1>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Game content */}
        <div className="min-h-[400px]">{renderContent()}</div>
      </div>
    </div>
  );
};
