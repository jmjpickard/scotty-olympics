import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { supabaseAdmin } from "~/server/supabaseAdmin";

export const participantRouter = createTRPCRouter({
  // Validate an invitation token
  validateInviteToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        // Find participant with matching token
        const participant = await db.participant.findFirst({
          where: {
            inviteToken: input.token,
          },
          select: {
            id: true,
            email: true,
            name: true,
            inviteTokenExpiry: true,
          },
        });

        // If no participant found with this token
        if (!participant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid invitation token",
          });
        }

        // Check if token has expired
        if (
          participant.inviteTokenExpiry &&
          new Date() > participant.inviteTokenExpiry
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation token has expired",
          });
        }

        return {
          isValid: true,
          participant: {
            id: participant.id,
            email: participant.email,
            name: participant.name,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error validating invitation token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while validating the invitation",
        });
      }
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      // Use Prisma to fetch all participants
      const participants = await db.participant.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      });

      return participants;
    } catch (error) {
      console.error("Unexpected error fetching participants:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while fetching participants",
      });
    }
  }),

  // Create or find a participant record for a user
  createOrGetParticipant: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string().email(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First, check if participant already exists
        const existingParticipant = await db.participant.findUnique({
          where: {
            userId: input.userId,
          },
          select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            avatarUrl: true,
            isAdmin: true,
            inviteToken: true,
            inviteTokenExpiry: true,
            createdAt: true,
          },
        });

        if (existingParticipant) {
          console.log(
            "Found existing participant with admin status:",
            existingParticipant.isAdmin,
          );
          return existingParticipant;
        }

        // If no participant with this user_id, check if email is already in use
        const existingEmail = await db.participant.findUnique({
          where: {
            email: input.email,
          },
          select: {
            email: true,
          },
        });

        // Handle email uniqueness
        let emailToUse = input.email;
        if (existingEmail) {
          // Add a random suffix to make the email unique if needed
          const randomSuffix = Date.now().toString().slice(-6);
          emailToUse = `${emailToUse.split("@")[0]}+${randomSuffix}@${emailToUse.split("@")[1]}`;
        }

        // Check if this email should be an admin (compare with env var)
        const adminEmail = process.env.ADMIN_EMAIL;
        const isAdmin =
          adminEmail && input.email.toLowerCase() === adminEmail.toLowerCase();

        console.log(
          `Creating new participant with email: ${emailToUse}, admin status: ${isAdmin}`,
        );

        // Create new participant
        const newParticipant = await db.participant.create({
          data: {
            userId: input.userId,
            email: emailToUse,
            name: input.name ?? input.email.split("@")[0] ?? "Athlete",
            isAdmin: isAdmin ? true : false,
          },
        });

        return newParticipant;
      } catch (error) {
        console.error("Unexpected error creating/getting participant:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // Update participant avatar URL
  updateAvatarUrl: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        avatarUrl: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Find participant by userId
        const participant = await db.participant.findUnique({
          where: {
            userId: input.userId,
          },
        });

        if (!participant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Participant not found",
          });
        }

        // Update avatar URL
        const updatedParticipant = await db.participant.update({
          where: {
            userId: input.userId,
          },
          data: {
            avatarUrl: input.avatarUrl,
          },
        });

        return updatedParticipant;
      } catch (error) {
        console.error("Error updating participant avatar URL:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating avatar URL",
        });
      }
    }),

  // Set password for a participant by email
  setUserPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log(`Setting password for user with email: ${input.email}`);

        // First, find the user by email
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.listUsers();

        if (userError) {
          console.error("Error listing users:", userError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to find user",
          });
        }

        // Find the user with matching email
        const user = userData.users.find(
          (u) => u.email?.toLowerCase() === input.email.toLowerCase(),
        );

        if (!user) {
          console.error(`User with email ${input.email} not found`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Update the user's password
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: input.password,
          });

        if (updateError) {
          console.error("Error updating user password:", updateError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update password",
          });
        }

        return {
          success: true,
          userId: user.id,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Unexpected error setting user password:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while setting the password",
        });
      }
    }),
});
