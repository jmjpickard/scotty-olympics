import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";

export const scoreRouter = createTRPCRouter({
  getLeaderboardData: publicProcedure.query(async ({ ctx }) => {
    try {
      // 1. Fetch all participants using Prisma
      const participants = await db.participant.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      });

      // 2. Fetch all scores using Prisma
      const scores = await db.score.findMany({
        select: {
          participantId: true,
          points: true,
        },
      });

      // 3. Aggregate Scores
      const pointTotals = new Map<string, number>();
      scores.forEach((score) => {
        const currentTotal = pointTotals.get(score.participantId) || 0;
        pointTotals.set(score.participantId, currentTotal + score.points);
      });

      // 4. Combine Data
      const leaderboardData = participants.map((participant) => ({
        ...participant,
        totalPoints: pointTotals.get(participant.id) || 0,
      }));

      // 5. Sort
      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

      return leaderboardData;
    } catch (error) {
      console.error("Unexpected error fetching leaderboard data:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while fetching leaderboard data",
      });
    }
  }),

  updateScore: adminProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        participantId: z.string().uuid(),
        scoreType: z.enum(["rank", "points"]),
        rank: z.number().int().min(1).max(14).optional(), // Ensure rank is within bounds
        points: z.number().int().min(0).optional(), // Direct points entry
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Calculate points based on input type
        let points: number;
        let rank: number;

        if (input.scoreType === "rank") {
          if (!input.rank) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Rank is required when using rank-based scoring",
            });
          }
          points = 15 - input.rank;
          rank = input.rank;
        } else {
          // Direct points entry
          if (input.points === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Points value is required when using direct points entry",
            });
          }
          points = input.points;
          rank = 0; // Use 0 as a placeholder for direct points entry
        }

        // Perform upsert operation using Prisma
        const data = await db.score.upsert({
          where: {
            participantId_eventId: {
              participantId: input.participantId,
              eventId: input.eventId,
            },
          },
          update: {
            rank: rank,
            points: points,
          },
          create: {
            eventId: input.eventId,
            participantId: input.participantId,
            rank: rank,
            points: points,
          },
        });

        return {
          success: true,
          message: "Score updated successfully",
          data,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        // Handle any other errors
        console.error("Unexpected error updating score:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating the score",
        });
      }
    }),
});
