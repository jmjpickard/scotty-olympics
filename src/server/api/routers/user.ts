import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
  updateAvatarUrl: protectedProcedure
    .input(z.object({ avatarPath: z.string() }))
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
          `[updateAvatarUrl] START - User: ${userId}, Path: ${input.avatarPath}`,
        );

        // Get the public URL for the uploaded file
        const { data: urlData } = ctx.supabase.storage
          .from("avatars")
          .getPublicUrl(input.avatarPath);

        const publicUrl = urlData.publicUrl;

        // Update the participant record in the database using Prisma
        const data = await db.participant.update({
          where: {
            userId: userId,
          },
          data: {
            avatarUrl: publicUrl,
          },
        });

        return {
          success: true,
          message: "Avatar updated successfully",
          avatarUrl: publicUrl,
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
});
