import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
  updateAvatarUrl: protectedProcedure
    .input(z.object({ avatarUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the current user ID from the authenticated session
        const userId = ctx.user?.id;

        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User ID not found in session",
          });
        }

        console.log(
          `[updateAvatarUrl] START - User: ${userId}, URL: ${input.avatarUrl}`,
        );

        // Update the participant record in the database using Prisma
        const data = await db.participant.update({
          where: {
            userId: userId,
          },
          data: {
            avatarUrl: input.avatarUrl,
          },
        });

        return {
          success: true,
          message: "Avatar updated successfully",
          avatarUrl: input.avatarUrl,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Unexpected error updating avatar:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating avatar",
        });
      }
    }),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1, "Name cannot be empty") }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;

        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User ID not found in session",
          });
        }

        console.log(
          `[updateName] START - User: ${userId}, Name: ${input.name}`,
        );

        const updatedParticipant = await db.participant.update({
          where: {
            userId: userId,
          },
          data: {
            name: input.name,
          },
        });

        return {
          success: true,
          message: "Name updated successfully",
          name: updatedParticipant.name,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Unexpected error updating name:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating name",
        });
      }
    }),
});
