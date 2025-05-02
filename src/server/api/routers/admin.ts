import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { supabaseAdmin } from "~/server/supabaseAdmin";
import { db } from "~/server/db";
import { randomUUID } from "crypto";
import { emailService } from "~/server/email";

export const adminRouter = createTRPCRouter({
  inviteParticipant: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[inviteParticipant] Inviting user: ${input.email}`);

        // Generate a unique invitation token
        const inviteToken = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

        // Check if participant with this email already exists
        const existingParticipant = await db.participant.findUnique({
          where: {
            email: input.email,
          },
        });

        if (existingParticipant) {
          // Update existing participant with new invitation token
          console.log(
            `Participant with email ${input.email} already exists. Updating with new invitation token.`,
          );
          await db.participant.update({
            where: {
              email: input.email,
            },
            data: {
              inviteToken,
              inviteTokenExpiry: expiresAt,
            },
          });
        } else {
          // Create new participant entry with invitation token
          try {
            await db.participant.create({
              data: {
                email: input.email,
                // Extract name from email (optional)
                name: input.email.split("@")[0],
                inviteToken,
                inviteTokenExpiry: expiresAt,
              },
            });
          } catch (participantError) {
            console.error(
              "Failed to create participant entry:",
              participantError,
            );
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create participant entry",
            });
          }
        }

        // Generate invitation URL with token
        const inviteUrl = `https://scotty-olympics.vercel.app/join?token=${inviteToken}`;

        // For development/testing purposes, log the invitation URL
        console.log(`[inviteParticipant] Invitation URL: ${inviteUrl}`);

        // In a production environment, you would send an email with the invitation link
        // For now, we'll use Supabase's email functionality, but note that this might
        // require additional configuration in your Supabase project

        try {
          // First try to create the user with Supabase Auth
          const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
              email: input.email,
              email_confirm: true,
              user_metadata: {
                inviteToken,
                inviteUrl,
              },
            });

          if (authError) {
            console.error("Error creating auth user:", authError);
            // Don't throw an error here, as we've already created the participant
            // Just log the error and continue
          } else {
            console.log(
              `[inviteParticipant] Auth user created: ${authData.user.id}`,
            );

            // Update the participant with the user ID
            await db.participant.update({
              where: {
                email: input.email,
              },
              data: {
                userId: authData.user.id,
              },
            });
          }

          // Send invitation email using Resend
          const { success, error } = await emailService.sendInvitation(
            input.email,
            input.email.split("@")[0], // Use email username as name
            inviteUrl,
          );

          if (error) {
            console.error("Error sending invitation email with Resend:", error);
          } else {
            console.log(
              `[inviteParticipant] Invitation email sent to: ${input.email}`,
            );
          }
        } catch (emailError) {
          console.error("Error sending invitation email:", emailError);
          // Don't throw an error here, as we've already created the participant
          // Just log the error and continue
        }

        // Return success even if email sending failed, as the participant was created
        // In a production environment, you might want to handle this differently

        return {
          success: true,
          message: `Successfully invited ${input.email}`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Unexpected error during invitation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred during invitation",
        });
      }
    }),

  // Toggle admin status for a participant
  toggleAdminStatus: adminProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
        isAdmin: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(
          `[toggleAdminStatus] ${input.isAdmin ? "Granting" : "Revoking"} admin for participant: ${input.participantId}`,
        );

        // Update participant admin status using Prisma
        const data = await db.participant.update({
          where: {
            id: input.participantId,
          },
          data: {
            isAdmin: input.isAdmin,
          },
        });

        return {
          success: true,
          message: `Successfully ${input.isAdmin ? "granted" : "revoked"} admin privileges`,
          data,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Unexpected error updating admin status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating admin status",
        });
      }
    }),
});
