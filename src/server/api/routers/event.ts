import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";

export const eventRouter = createTRPCRouter({
  // Get event with scores
  getEventWithScores: publicProcedure
    .input(
      z.object({
        eventId: z.string().uuid("Invalid event ID"),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Get the event details
        const event = await db.event.findUnique({
          where: {
            id: input.eventId,
          },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        // Get all scores for this event with participant information
        const scores = await db.score.findMany({
          where: {
            eventId: input.eventId,
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
          orderBy: {
            rank: "asc",
          },
        });

        return {
          event,
          scores,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Unexpected error fetching event with scores:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching event data",
        });
      }
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      // Use Prisma to fetch all events
      const events = await db.event.findMany({
        orderBy: {
          order: "asc",
        },
      });

      return events;
    } catch (error) {
      console.error("Unexpected error fetching events:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while fetching events",
      });
    }
  }),

  // Create a new event (admin only)
  createEvent: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Event name is required"),
        description: z.string().optional(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if an event with this name already exists using Prisma
        const existingEvent = await db.event.findFirst({
          where: {
            name: input.name,
          },
          select: {
            id: true,
          },
        });

        if (existingEvent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `An event with the name "${input.name}" already exists`,
          });
        }

        // Create the new event using Prisma
        const newEvent = await db.event.create({
          data: {
            name: input.name,
            description: input.description,
            order: input.order,
          },
        });

        return newEvent;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Unexpected error creating event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating the event",
        });
      }
    }),

  // Update an existing event (admin only)
  updateEvent: adminProcedure
    .input(
      z.object({
        id: z.string().uuid("Invalid event ID"),
        name: z.string().min(1, "Event name is required"),
        description: z.string().optional(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if an event with this name already exists (excluding the current event)
        const existingEvent = await db.event.findFirst({
          where: {
            name: input.name,
            id: {
              not: input.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingEvent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Another event with the name "${input.name}" already exists`,
          });
        }

        // Update the event using Prisma
        const updatedEvent = await db.event.update({
          where: {
            id: input.id,
          },
          data: {
            name: input.name,
            description: input.description,
            order: input.order,
          },
        });

        return updatedEvent;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Unexpected error updating event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating the event",
        });
      }
    }),

  // Delete an event (admin only)
  deleteEvent: adminProcedure
    .input(
      z.object({
        id: z.string().uuid("Invalid event ID"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if there are any scores associated with this event using Prisma
        const scoresCount = await db.score.count({
          where: {
            eventId: input.id,
          },
        });

        if (scoresCount > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete event with associated scores. Please delete the scores first or contact an administrator.",
          });
        }

        // Delete the event using Prisma
        await db.event.delete({
          where: {
            id: input.id,
          },
        });

        return { success: true, message: "Event deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Unexpected error deleting event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while deleting the event",
        });
      }
    }),
});
