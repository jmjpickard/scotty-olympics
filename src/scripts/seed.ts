import { db } from "~/server/db";

/**
 * Seeds the database with test data
 */
async function main() {
  console.log("Seeding database...");

  // Clean up existing posts
  console.log("Cleaning up existing posts...");
  await db.post.deleteMany({});

  // Create a new post
  console.log("Creating new post...");
  const newPost = await db.post.create({
    data: {
      name: "Test Post",
    },
  });
  console.log("Created post:", newPost);

  // Verify we can read it back
  console.log("Verifying post can be retrieved...");
  const posts = await db.post.findMany();
  console.log("Retrieved posts:", posts);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
