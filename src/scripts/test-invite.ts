import { db } from "~/server/db";
import { randomUUID } from "crypto";

/**
 * Test script to verify the invitation token functionality
 * This script creates a test participant with an invitation token
 * and then validates the token
 */
async function testInviteToken() {
  console.log("Starting invitation token test...");

  try {
    // Generate a test token
    const testToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    const testEmail = `test-${Date.now()}@example.com`;

    console.log(`Creating test participant with email: ${testEmail}`);
    console.log(`Test token: ${testToken}`);

    // Create a test participant with the token
    const participant = await db.participant.create({
      data: {
        email: testEmail,
        name: "Test Participant",
        inviteToken: testToken,
        inviteTokenExpiry: expiresAt,
      },
    });

    console.log(`Created participant: ${participant.id}`);

    // Validate the token
    console.log("Validating token...");
    const foundParticipant = await db.participant.findFirst({
      where: {
        inviteToken: testToken,
      },
      select: {
        id: true,
        email: true,
        name: true,
        inviteTokenExpiry: true,
      },
    });

    if (!foundParticipant) {
      console.error("❌ Token validation failed: Participant not found");
      return;
    }

    console.log("✅ Token validation successful!");
    console.log("Found participant:", foundParticipant);

    // Check if token has expired
    if (
      foundParticipant.inviteTokenExpiry &&
      new Date() > foundParticipant.inviteTokenExpiry
    ) {
      console.log("❌ Token has expired");
    } else {
      console.log("✅ Token is valid and not expired");
    }

    // Clean up - delete the test participant
    await db.participant.delete({
      where: {
        id: participant.id,
      },
    });

    console.log("Test participant deleted");
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Disconnect from the database
    await db.$disconnect();
  }
}

// Run the test
testInviteToken().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
