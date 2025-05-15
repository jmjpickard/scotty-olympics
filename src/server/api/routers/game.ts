import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client"; // Import Prisma for types if needed, though often inferred

export const gameRouter = createTRPCRouter({
  // Create a new game
  createGame: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to create a game",
      });
    }

    const participant = await ctx.db.participant.findFirst({
      where: { userId: ctx.user.id },
    });

    if (!participant) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must have a participant profile to create a game",
      });
    }

    const newGame = await ctx.db.game.create({
      data: {
        status: "waiting",
        participants: {
          create: {
            participantId: participant.id,
            tapCount: 0,
          },
        },
      },
    });

    return newGame;
  }),

  // Get a game by ID
  getGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          participants: {
            // GameParticipant records
            include: {
              participant: true, // The actual Participant record
            },
            orderBy: {
              // Optional: define an order for participants if necessary
              // e.g. tapCount: 'desc' or by a join timestamp if available
            },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      return {
        ...game,
        participants: game.participants.map((gp) => ({
          id: gp.id,
          gameId: gp.gameId,
          participantId: gp.participantId,
          tapCount: gp.tapCount,
          rank: gp.rank,
          scoreAwarded: gp.scoreAwarded,
          name: gp.participant.name,
          email: gp.participant.email,
          avatarUrl: gp.participant.avatarUrl,
        })),
      };
    }),

  // Get all active games (waiting for players)
  getActiveGames: publicProcedure.query(async ({ ctx }) => {
    const games = await ctx.db.game.findMany({
      where: {
        status: "waiting", // Only fetch games in 'waiting' state
      },
      include: {
        participants: {
          include: {
            participant: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return games.map((game) => ({
      ...game,
      participants: game.participants.map((gp) => ({
        id: gp.id,
        gameId: gp.gameId,
        participantId: gp.participantId,
        tapCount: gp.tapCount,
        rank: gp.rank,
        scoreAwarded: gp.scoreAwarded,
        name: gp.participant.name,
        email: gp.participant.email,
        avatarUrl: gp.participant.avatarUrl,
      })),
    }));
  }),

  // Join a game
  joinGame: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to join a game",
        });
      }

      const participant = await ctx.db.participant.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to join a game",
        });
      }

      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: { id: true, status: true }, // Only select needed fields
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.status !== "waiting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot join a game that has already started",
        });
      }

      const existingGameParticipant = await ctx.db.gameParticipant.findUnique({
        where: {
          gameId_participantId: {
            gameId: input.gameId,
            participantId: participant.id,
          },
        },
      });

      if (existingGameParticipant) {
        return game; // Already joined, return basic game info
      }

      await ctx.db.gameParticipant.create({
        data: {
          gameId: input.gameId,
          participantId: participant.id,
          tapCount: 0,
        },
      });

      return game; // Return basic game info
    }),

  // Start a game
  startGame: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to start a game",
        });
      }

      const currentUserParticipant = await ctx.db.participant.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!currentUserParticipant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to start a game",
        });
      }

      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          participants: {
            // GameParticipant records
            select: { participantId: true },
          },
        },
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (game.status !== "waiting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already started or is not in a waiting state.",
        });
      }

      const isParticipantInGame = game.participants.some(
        (p) => p.participantId === currentUserParticipant.id,
      );

      if (!isParticipantInGame) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be a participant in the game to start it",
        });
      }

      const startTime = new Date();
      startTime.setSeconds(startTime.getSeconds() + 3);

      const updatedGame = await ctx.db.game.update({
        where: { id: input.gameId },
        data: { status: "starting", startedAt: startTime },
      });

      setTimeout(() => {
        void (async () => {
          try {
            await ctx.db.game.update({
              where: { id: input.gameId, status: "starting" }, // Ensure still starting
              data: { status: "in_progress" },
            });

            setTimeout(() => {
              void (async () => {
                try {
                  const finishTime = new Date();
                  await ctx.db.game.update({
                    where: { id: input.gameId, status: "in_progress" }, // Ensure still in_progress
                    data: { status: "finished", finishedAt: finishTime },
                  });
                } catch (error) {
                  console.error(
                    `Error auto-finishing game ${input.gameId}:`,
                    error,
                  );
                }
              })();
            }, 10000); // 10 seconds for the game duration
          } catch (error) {
            console.error(
              `Error auto-starting game to in_progress ${input.gameId}:`,
              error,
            );
          }
        })();
      }, 3000); // 3 seconds for the countdown

      return updatedGame;
    }),

  // Update tap count
  updateTapCount: protectedProcedure
    .input(z.object({ gameId: z.string(), tapCount: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update tap count",
        });
      }

      const participant = await ctx.db.participant.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to update tap count",
        });
      }

      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        select: { status: true },
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (game.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update tap count for a game that is not in progress",
        });
      }

      const updatedGameParticipant = await ctx.db.gameParticipant.update({
        where: {
          gameId_participantId: {
            gameId: input.gameId,
            participantId: participant.id,
          },
        },
        data: { tapCount: input.tapCount },
      });

      return updatedGameParticipant;
    }),

  // Finish a game and calculate results
  finishGame: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to finish a game",
        });
      }

      const currentUserParticipant = await ctx.db.participant.findFirst({
        where: { userId: ctx.user.id },
      });

      if (!currentUserParticipant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to finish a game",
        });
      }

      const game = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          participants: {
            // GameParticipant records
            include: {
              participant: true, // The actual Participant record
            },
          },
        },
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (game.status !== "finished") {
        // It's possible the game auto-finished, but this client is trying to finish it.
        // Or, it might be called by an admin or a specific trigger.
        // For now, let's assume it must be in 'finished' state by the auto-timer.
        // If manual finishing is allowed earlier, this logic might change.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Game is not finished yet. Current status: ${game.status}`,
        });
      }

      // Check if the current user is a participant in the game
      // This check might be redundant if only game logic (e.g. server-side timer) calls finish,
      // but good for protection if clients can call it.
      const isParticipantInGame = game.participants.some(
        (p) => p.participantId === currentUserParticipant.id,
      );

      if (!isParticipantInGame) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "You must be a participant in the game to finalize its results.",
        });
      }

      // Map to the structure expected by sorting and points calculation if needed,
      // or use game.participants directly if structure is compatible.
      // The original code used a DbGameParticipant structure that included p.name, p.email etc.
      // Prisma's include gives us game.participants[i].participant.name
      const gameParticipantsForRanking = game.participants.map((gp) => ({
        id: gp.id, // GameParticipant ID
        gameId: gp.gameId,
        participantId: gp.participantId, // Actual Participant ID
        tapCount: gp.tapCount,
        rank: gp.rank,
        scoreAwarded: gp.scoreAwarded,
        // Participant details for context if needed, though not directly used in rank/score update below
        name: gp.participant.name,
        email: gp.participant.email,
        avatarUrl: gp.participant.avatarUrl,
      }));

      const sortedParticipants = [...gameParticipantsForRanking].sort(
        (a, b) => b.tapCount - a.tapCount,
      );

      const pointsMap = [100, 75, 50]; // 1st, 2nd, 3rd place points
      const defaultPoints = 10; // Participation points

      let rowHarderEvent = await ctx.db.event.findFirst({
        where: { name: "Row Harder!" },
      });

      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      if (!rowHarderEvent) {
        rowHarderEvent = await ctx.db.event.create({
          data: {
            name: "Row Harder!",
            description: "Secret button mashing competition",
          },
        });
      }

      const participantIdsForScoreLookup = sortedParticipants.map(
        (p) => p.participantId,
      );
      const existingScoresForEvent = await ctx.db.score.findMany({
        where: {
          participantId: { in: participantIdsForScoreLookup },
          eventId: rowHarderEvent.id,
        },
      });
      const existingScoresMap = new Map(
        existingScoresForEvent.map((s) => [
          `${s.participantId}_${s.eventId}`,
          s,
        ]),
      );

      const transactionOperations: Prisma.PrismaPromise<unknown>[] = [];

      for (let i = 0; i < sortedParticipants.length; i++) {
        const gp = sortedParticipants[i]; // This is the mapped structure
        const rank = i + 1;
        const scoreAwarded = i < 3 ? pointsMap[i] : defaultPoints;

        if (!gp) {
          continue; // Should be logically impossible, but satisfies TS
        }

        transactionOperations.push(
          ctx.db.gameParticipant.update({
            where: { id: gp.id }, // gp.id is GameParticipant's ID
            data: { rank, scoreAwarded },
          }),
        );

        const finalPointsAwarded = scoreAwarded ?? defaultPoints;
        const existingScore = existingScoresMap.get(
          `${gp.participantId}_${rowHarderEvent.id}`,
        );

        if (existingScore) {
          transactionOperations.push(
            ctx.db.score.update({
              where: { id: existingScore.id },
              data: {
                points: existingScore.points + finalPointsAwarded,
                rank: Math.min(existingScore.rank, rank),
              },
            }),
          );
        } else {
          transactionOperations.push(
            ctx.db.score.create({
              data: {
                participantId: gp.participantId,
                eventId: rowHarderEvent.id,
                rank,
                points: finalPointsAwarded,
              },
            }),
          );
        }
      }

      await ctx.db.$transaction(transactionOperations);

      // Return the updated game with participants, similar to getGame
      const finalGameData = await ctx.db.game.findUnique({
        where: { id: input.gameId },
        include: {
          participants: {
            include: {
              participant: true,
            },
            orderBy: {
              // Order by rank or tap count for consistency
              rank: "asc",
            },
          },
        },
      });

      if (!finalGameData) {
        // Should not happen if we just processed it
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve game data after finishing.",
        });
      }

      return {
        ...finalGameData,
        participants: finalGameData.participants.map((gp) => ({
          id: gp.id,
          gameId: gp.gameId,
          participantId: gp.participantId,
          tapCount: gp.tapCount,
          rank: gp.rank,
          scoreAwarded: gp.scoreAwarded,
          name: gp.participant.name,
          email: gp.participant.email,
          avatarUrl: gp.participant.avatarUrl,
        })),
      };
    }),
});
