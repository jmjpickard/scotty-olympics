import { db } from "~/server/db";

/**
 * Seeds the database with test data
 */
async function main() {
  console.log("Seeding database...");

  // Clean up existing data
  console.log("Cleaning up existing scores...");
  await db.score.deleteMany({});

  console.log("Cleaning up existing participants...");
  await db.participant.deleteMany({});

  console.log("Cleaning up existing events...");
  await db.event.deleteMany({});

  // Create sample events
  console.log("Creating sample events...");
  const events = await Promise.all([
    db.event.create({
      data: {
        name: "100m Sprint",
        description: "A sprint race over 100 meters",
        order: 1,
      },
    }),
    db.event.create({
      data: {
        name: "Long Jump",
        description: "A jumping competition measuring distance",
        order: 2,
      },
    }),
    db.event.create({
      data: {
        name: "Swimming",
        description: "A 50m freestyle swimming race",
        order: 3,
      },
    }),
  ]);
  console.log("Created events:", events);

  // Create sample participants
  console.log("Creating sample participants...");
  const participants = await Promise.all([
    db.participant.create({
      data: {
        name: "John Doe",
        email: "john@example.com",
        isAdmin: false,
      },
    }),
    db.participant.create({
      data: {
        name: "Jane Smith",
        email: "jane@example.com",
        isAdmin: false,
      },
    }),
    db.participant.create({
      data: {
        name: "Admin User",
        email: "admin@example.com",
        isAdmin: true,
      },
    }),
  ]);
  console.log("Created participants:", participants);

  // Create sample scores
  console.log("Creating sample scores...");
  const scores = await Promise.all([
    db.score.create({
      data: {
        participantId: participants[0].id,
        eventId: events[0].id,
        rank: 1,
        points: 10,
      },
    }),
    db.score.create({
      data: {
        participantId: participants[1].id,
        eventId: events[0].id,
        rank: 2,
        points: 8,
      },
    }),
    db.score.create({
      data: {
        participantId: participants[0].id,
        eventId: events[1].id,
        rank: 2,
        points: 8,
      },
    }),
    db.score.create({
      data: {
        participantId: participants[1].id,
        eventId: events[1].id,
        rank: 1,
        points: 10,
      },
    }),
  ]);
  console.log("Created scores:", scores);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
