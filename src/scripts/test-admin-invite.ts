import { db } from "~/server/db";
import { supabaseAdmin } from "~/server/supabaseAdmin";
import { randomUUID } from "crypto";
import { emailService } from "~/server/email";

/**
 * Test script to verify the admin invitation process
 * This script simulates the admin inviting a participant and re-inviting an existing participant
 */
async function testAdminInvite() {
  console.log("Starting admin invitation test...");

  try {
    // Generate a test email with a timestamp to ensure uniqueness
    const testEmail = `jack.pickard+test${Date.now()}@hotmail.com`;
    console.log(`Test email: ${testEmail}`);

    // Test Case 1: Create a new participant
    console.log("\n--- Test Case 1: Create a new participant ---");

    // Generate a unique invitation token
    const inviteToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    console.log(`Creating participant with invitation token: ${inviteToken}`);

    // Create participant entry with invitation token
    const participant = await db.participant.create({
      data: {
        email: testEmail,
        name: testEmail.split("@")[0],
        inviteToken,
        inviteTokenExpiry: expiresAt,
      },
    });

    console.log(`Created participant: ${participant.id}`);

    // Test Case 2: Re-invite the same participant
    console.log("\n--- Test Case 2: Re-invite the same participant ---");

    // Generate a new invitation token
    const newInviteToken = randomUUID();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    console.log(`Re-inviting participant with new token: ${newInviteToken}`);

    // Update the existing participant with a new invitation token
    const updatedParticipant = await db.participant.update({
      where: {
        email: testEmail,
      },
      data: {
        inviteToken: newInviteToken,
        inviteTokenExpiry: newExpiresAt,
      },
    });

    console.log(`Updated participant: ${updatedParticipant.id}`);
    console.log(`New invitation token: ${updatedParticipant.inviteToken}`);

    // Generate invitation URL
    const inviteUrl = `https://scotty-olympics.vercel.app/join?token=${inviteToken}`;
    console.log(`Invitation URL: ${inviteUrl}`);

    // For testing purposes, we'll try to create a user in Supabase Auth
    console.log("Attempting to create user in Supabase Auth...");

    try {
      // First create the user in Supabase Auth
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: testEmail,
          email_confirm: true,
          user_metadata: {
            inviteToken,
            inviteUrl,
          },
        });

      if (authError) {
        console.error("Error creating auth user:", authError);
      } else {
        console.log(`Auth user created: ${authData.user.id}`);

        // Update the participant with the user ID
        await db.participant.update({
          where: {
            id: participant.id,
          },
          data: {
            userId: authData.user.id,
          },
        });

        console.log(`Updated participant with user ID: ${authData.user.id}`);

        // Send invitation email using Resend
        const { success, error: emailError } =
          await emailService.sendInvitation(
            testEmail,
            testEmail.split("@")[0], // Use email username as name
            inviteUrl,
          );

        if (emailError) {
          console.error(
            "Error sending invitation email with Resend:",
            emailError,
          );
        } else {
          console.log(`Invitation email sent to: ${testEmail}`);
        }
      }
    } catch (authError) {
      console.error("Error during auth user creation:", authError);
    }

    // Clean up - delete the test participant
    await db.participant.delete({
      where: {
        id: participant.id,
      },
    });

    console.log("Test participant deleted");
    console.log("Test completed!");
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Disconnect from the database
    await db.$disconnect();
  }
}

// Run the test
testAdminInvite().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
