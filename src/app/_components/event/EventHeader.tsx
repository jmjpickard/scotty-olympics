"use client";

import type { Event } from "@prisma/client";

interface EventHeaderProps {
  event: Event;
}

export const EventHeader = ({ event }: EventHeaderProps) => {
  return (
    <div className="flex flex-col">
      <h1 className="greek-column-header mb-2 text-3xl font-bold">
        {event.name}
      </h1>
      {event.description && (
        <p className="mt-2 text-gray-300">{event.description}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="rounded-full bg-white/10 px-3 py-1 text-sm">
          <span className="mr-1">🏆</span> Event #{event.order ?? "N/A"}
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-sm">
          <span className="mr-1">🗓️</span> Created{" "}
          {new Date(event.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
