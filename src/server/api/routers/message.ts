import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

export const messageRouter = createTRPCRouter({
  getMessages: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const messages = await db.message.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to send messages",
        });
      }

      const userId = ctx.user.id;

      // Find the participant record for this user
      const participant = await db.participant.findUnique({
        where: {
          userId,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be a participant to send messages",
        });
      }

      // Create the message
      const message = await db.message.create({
        data: {
          content: input.content,
          participantId: participant.id,
        },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      return message;
    }),

  reportMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to report messages",
        });
      }

      const userId = ctx.user.id;

      // Find the participant record for this user
      const participant = await db.participant.findUnique({
        where: {
          userId,
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be a participant to report messages",
        });
      }

      // Check if the message exists
      const message = await db.message.findUnique({
        where: {
          id: input.messageId,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      // In a real application, you would store the report in a database
      // For now, we'll just log it
      console.log(
        `Message ${input.messageId} reported by ${participant.id} for reason: ${input.reason}`,
      );

      return {
        success: true,
        message: "Message reported successfully",
      };
    }),
});
