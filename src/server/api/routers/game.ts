import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { GameParticipant } from "@prisma/client";

export const gameRouter = createTRPCRouter({
  // Create a new game
  createGame: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to create a game",
      });
    }

    // Get the current user's participant record
    const participant = await ctx.db.participant.findFirst({
      where: {
        userId: ctx.user.id,
      },
    });

    if (!participant) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must have a participant profile to create a game",
      });
    }

    // Create a new game
    const game = await ctx.db.$queryRaw`
      INSERT INTO games (id, status, created_at)
      VALUES (gen_random_uuid(), 'waiting', NOW())
      RETURNING id, status, created_at as "createdAt"
    `;

    const gameId = (game as any)[0].id;

    // Add the creator as the first participant
    await ctx.db.$queryRaw`
      INSERT INTO game_participants (id, game_id, participant_id, tap_count)
      VALUES (gen_random_uuid(), ${gameId}, ${participant!.id}, 0)
    `;

    return (game as any)[0];
  }),

  // Get a game by ID
  getGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.$queryRaw`
        SELECT g.id, g.status, g.created_at as "createdAt", g.started_at as "startedAt", g.finished_at as "finishedAt"
        FROM games g
        WHERE g.id = ${input.gameId}
      `;

      if (!game || (game as any[]).length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      const participants = await ctx.db.$queryRaw`
        SELECT gp.id, gp.game_id as "gameId", gp.participant_id as "participantId", 
               gp.tap_count as "tapCount", gp.rank, gp.score_awarded as "scoreAwarded",
               p.name, p.email, p.avatar_url as "avatarUrl"
        FROM game_participants gp
        JOIN participants p ON gp.participant_id = p.id
        WHERE gp.game_id = ${input.gameId}
      `;

      return {
        ...(game as any)[0],
        participants: participants as any[],
      };
    }),

  // Get all active games (waiting or in progress)
  getActiveGames: publicProcedure.query(async ({ ctx }) => {
    const games = await ctx.db.$queryRaw`
      SELECT g.id, g.status, g.created_at as "createdAt", g.started_at as "startedAt", g.finished_at as "finishedAt"
      FROM games g
      WHERE g.status IN ('waiting', 'starting', 'in_progress')
      ORDER BY g.created_at DESC
    `;

    const gameIds = (games as any[]).map((g) => g.id);

    if (gameIds.length === 0) {
      return [];
    }

    const participants = await ctx.db.$queryRaw`
      SELECT gp.id, gp.game_id as "gameId", gp.participant_id as "participantId", 
             gp.tap_count as "tapCount", gp.rank, gp.score_awarded as "scoreAwarded",
             p.name, p.email, p.avatar_url as "avatarUrl"
      FROM game_participants gp
      JOIN participants p ON gp.participant_id = p.id
      WHERE gp.game_id IN (${gameIds.join(",")})
    `;

    // Group participants by game
    const participantsByGame = (participants as any[]).reduce(
      (acc, p) => {
        if (!acc[p.gameId]) {
          acc[p.gameId] = [];
        }
        acc[p.gameId].push(p);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Attach participants to their games
    return (games as any[]).map((game) => ({
      ...game,
      participants: participantsByGame[game.id] || [],
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

      // Get the current user's participant record
      const participant = await ctx.db.participant.findFirst({
        where: {
          userId: ctx.user.id,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to join a game",
        });
      }

      // Check if the game exists and is in waiting status
      const game = await ctx.db.$queryRaw`
        SELECT id, status
        FROM games
        WHERE id = ${input.gameId}
      `;

      if (!game || (game as any[]).length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if ((game as any)[0].status !== "waiting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot join a game that has already started",
        });
      }

      // Check if the participant is already in the game
      const existingParticipant = await ctx.db.$queryRaw`
        SELECT id
        FROM game_participants
        WHERE game_id = ${input.gameId} AND participant_id = ${participant!.id}
      `;

      if (existingParticipant && (existingParticipant as any[]).length > 0) {
        // Already joined, just return the game
        return (game as any)[0];
      }

      // Add the participant to the game
      await ctx.db.$queryRaw`
        INSERT INTO game_participants (id, game_id, participant_id, tap_count)
        VALUES (gen_random_uuid(), ${input.gameId}, ${participant!.id}, 0)
      `;

      return (game as any)[0];
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

      // Get the current user's participant record
      const participant = await ctx.db.participant.findFirst({
        where: {
          userId: ctx.user.id,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to start a game",
        });
      }

      // Check if the game exists
      const game = await ctx.db.$queryRaw`
        SELECT id, status
        FROM games
        WHERE id = ${input.gameId}
      `;

      if (!game || (game as any[]).length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if ((game as any)[0].status !== "waiting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already started",
        });
      }

      // Check if the participant is in the game
      const gameParticipants = await ctx.db.$queryRaw`
        SELECT participant_id as "participantId"
        FROM game_participants
        WHERE game_id = ${input.gameId}
      `;

      // Check if the participant is in the game
      const isParticipant = (gameParticipants as any[]).some(
        (p) => p.participantId === participant!.id,
      );

      if (!isParticipant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be a participant in the game to start it",
        });
      }

      // Calculate the start time (3 seconds from now)
      const startTime = new Date();
      startTime.setSeconds(startTime.getSeconds() + 3);

      // Update the game status to starting
      await ctx.db.$queryRaw`
        UPDATE games
        SET status = 'starting', started_at = ${startTime}
        WHERE id = ${input.gameId}
      `;

      const updatedGame = await ctx.db.$queryRaw`
        SELECT id, status, created_at as "createdAt", started_at as "startedAt", finished_at as "finishedAt"
        FROM games
        WHERE id = ${input.gameId}
      `;

      // Schedule the game to move to "in_progress" after the countdown
      setTimeout(async () => {
        try {
          await ctx.db.$queryRaw`
            UPDATE games
            SET status = 'in_progress'
            WHERE id = ${input.gameId}
          `;

          // Schedule the game to finish after 10 seconds
          setTimeout(async () => {
            try {
              const finishTime = new Date();
              await ctx.db.$queryRaw`
                UPDATE games
                SET status = 'finished', finished_at = ${finishTime}
                WHERE id = ${input.gameId}
              `;
            } catch (error) {
              console.error("Error finishing game:", error);
            }
          }, 10000); // 10 seconds for the game duration
        } catch (error) {
          console.error("Error starting game:", error);
        }
      }, 3000); // 3 seconds for the countdown

      return (updatedGame as any)[0];
    }),

  // Update tap count
  updateTapCount: protectedProcedure
    .input(z.object({ gameId: z.string(), tapCount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update tap count",
        });
      }

      // Get the current user's participant record
      const participant = await ctx.db.participant.findFirst({
        where: {
          userId: ctx.user.id,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to update tap count",
        });
      }

      // Check if the game exists and is in progress
      const game = await ctx.db.$queryRaw`
        SELECT id, status
        FROM games
        WHERE id = ${input.gameId}
      `;

      if (!game || (game as any[]).length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if ((game as any)[0].status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update tap count for a game that is not in progress",
        });
      }

      // Update the participant's tap count
      await ctx.db.$queryRaw`
        UPDATE game_participants
        SET tap_count = ${input.tapCount}
        WHERE game_id = ${input.gameId} AND participant_id = ${participant!.id}
      `;

      const gameParticipant = await ctx.db.$queryRaw`
        SELECT id, game_id as "gameId", participant_id as "participantId", tap_count as "tapCount", rank, score_awarded as "scoreAwarded"
        FROM game_participants
        WHERE game_id = ${input.gameId} AND participant_id = ${participant!.id}
      `;

      return (gameParticipant as any)[0];
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

      // Get the current user's participant record
      const participant = await ctx.db.participant.findFirst({
        where: {
          userId: ctx.user.id,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must have a participant profile to finish a game",
        });
      }

      // Check if the game exists
      const game = await ctx.db.$queryRaw`
        SELECT id, status
        FROM games
        WHERE id = ${input.gameId}
      `;

      if (!game || (game as any[]).length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if ((game as any)[0].status !== "finished") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not finished yet",
        });
      }

      // Get all participants for this game
      const gameParticipants = await ctx.db.$queryRaw`
        SELECT gp.id, gp.game_id as "gameId", gp.participant_id as "participantId", 
               gp.tap_count as "tapCount", gp.rank, gp.score_awarded as "scoreAwarded",
               p.name, p.email, p.avatar_url as "avatarUrl"
        FROM game_participants gp
        JOIN participants p ON gp.participant_id = p.id
        WHERE gp.game_id = ${input.gameId}
      `;

      // Check if the participant is in the game
      const isParticipant = (gameParticipants as any[]).some(
        (p) => p.participantId === participant!.id,
      );

      if (!isParticipant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be a participant in the game to finish it",
        });
      }

      // Sort participants by tap count (descending)
      const sortedParticipants = [...(gameParticipants as any[])].sort(
        (a, b) => b.tapCount - a.tapCount,
      );

      // Calculate ranks and award points
      const pointsMap = [100, 75, 50]; // 1st, 2nd, 3rd place points
      const defaultPoints = 10; // Participation points

      // Update each participant with rank and points
      const updatePromises = sortedParticipants.map(async (gp, index) => {
        const rank = index + 1;
        const points = index < 3 ? pointsMap[index] : defaultPoints;

        // Update game participant with rank and points
        await ctx.db.$queryRaw`
          UPDATE game_participants
          SET rank = ${rank}, score_awarded = ${points}
          WHERE id = ${gp.id}
        `;

        // Create a special "Row Harder" event if it doesn't exist
        let rowHarderEvent = await ctx.db.event.findFirst({
          where: {
            name: "Row Harder!",
          },
        });

        if (!rowHarderEvent) {
          rowHarderEvent = await ctx.db.event.create({
            data: {
              name: "Row Harder!",
              description: "Secret button mashing competition",
            },
          });
        }

        // Check if the participant already has a score for this event
        const existingScore = await ctx.db.score.findUnique({
          where: {
            participantId_eventId: {
              participantId: gp.participantId,
              eventId: rowHarderEvent.id,
            },
          },
        });

        const finalPoints = points || defaultPoints;

        if (existingScore) {
          // Update existing score
          await ctx.db.score.update({
            where: {
              id: existingScore.id,
            },
            data: {
              points: existingScore.points + finalPoints,
              rank: Math.min(existingScore.rank, rank), // Keep the best rank
            },
          });
        } else {
          // Create new score
          await ctx.db.score.create({
            data: {
              participantId: gp.participantId,
              eventId: rowHarderEvent.id,
              rank,
              points: finalPoints,
            },
          });
        }
      });

      await Promise.all(updatePromises);

      // Return the updated game with participants
      const updatedGame = await ctx.db.$queryRaw`
        SELECT id, status, created_at as "createdAt", started_at as "startedAt", finished_at as "finishedAt"
        FROM games
        WHERE id = ${input.gameId}
      `;

      const updatedParticipants = await ctx.db.$queryRaw`
        SELECT gp.id, gp.game_id as "gameId", gp.participant_id as "participantId", 
               gp.tap_count as "tapCount", gp.rank, gp.score_awarded as "scoreAwarded",
               p.name, p.email, p.avatar_url as "avatarUrl"
        FROM game_participants gp
        JOIN participants p ON gp.participant_id = p.id
        WHERE gp.game_id = ${input.gameId}
        ORDER BY gp.tap_count DESC
      `;

      return {
        ...(updatedGame as any)[0],
        participants: updatedParticipants as any[],
      };
    }),
});
