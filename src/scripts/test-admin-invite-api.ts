import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";
import superjson from "superjson";

/**
 * Test script to verify the admin invitation API
 * This script tests both creating a new participant and re-inviting an existing one
 */
async function testAdminInviteApi() {
  console.log("Starting admin invitation API test...");

  // Create a TRPC client
  const trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  try {
    // Generate a test email with a timestamp to ensure uniqueness
    const testEmail = `jack.pickard+test${Date.now()}@hotmail.com`;
    console.log(`Test email: ${testEmail}`);

    // Test Case 1: Invite a new participant
    console.log("\n--- Test Case 1: Invite a new participant ---");
    const result1 = await trpc.admin.inviteParticipant.mutate({
      email: testEmail,
    });
    console.log("Result:", result1);

    // Test Case 2: Re-invite the same participant
    console.log("\n--- Test Case 2: Re-invite the same participant ---");
    const result2 = await trpc.admin.inviteParticipant.mutate({
      email: testEmail,
    });
    console.log("Result:", result2);

    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run the test
testAdminInviteApi().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
