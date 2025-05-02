"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * Form component for admin to manage events (add, edit, delete)
 * Only visible to admin users
 */
export const EventManagementForm = () => {
  // Form state
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch events data with automatic refetching
  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = api.event.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Create event mutation
  const createEventMutation = api.event.createEvent.useMutation({
    onSuccess: () => {
      setMessage({ text: "Event created successfully", type: "success" });
      setIsSubmitting(false);
      resetForm();
      refetchEvents();
    },
    onError: (error) => {
      setMessage({ text: error.message, type: "error" });
      setIsSubmitting(false);
    },
  });

  // Update event mutation
  const updateEventMutation = api.event.updateEvent.useMutation({
    onSuccess: () => {
      setMessage({ text: "Event updated successfully", type: "success" });
      setIsSubmitting(false);
      resetForm();
      refetchEvents();
    },
    onError: (error) => {
      setMessage({ text: error.message, type: "error" });
      setIsSubmitting(false);
    },
  });

  // Delete event mutation
  const deleteEventMutation = api.event.deleteEvent.useMutation({
    onSuccess: () => {
      setMessage({ text: "Event deleted successfully", type: "success" });
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      refetchEvents();
    },
    onError: (error) => {
      setMessage({ text: error.message, type: "error" });
      setShowDeleteConfirm(false);
    },
  });

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormMode("add");
    setCurrentEventId(null);
    setName("");
    setDescription("");
    setOrder(undefined);
  };

  /**
   * Sets up the form for editing an existing event
   */
  const handleEditEvent = (event: any) => {
    setFormMode("edit");
    setCurrentEventId(event.id);
    setName(event.name);
    setDescription(event.description || "");
    setOrder(event.order);
    setMessage(null);
    // Scroll to form
    document
      .getElementById("event-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Initiates the delete confirmation for an event
   */
  const handleDeleteClick = (event: any) => {
    setEventToDelete({ id: event.id, name: event.name });
    setShowDeleteConfirm(true);
    setMessage(null);
  };

  /**
   * Confirms and executes the deletion of an event
   */
  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate({ id: eventToDelete.id });
    }
  };

  /**
   * Handles form submission for creating or updating an event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Validate inputs
    if (!name) {
      setMessage({
        text: "Please enter an event name",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    // Parse order as number if provided
    const orderValue = order !== undefined ? Number(order) : undefined;

    if (formMode === "add") {
      // Create new event
      createEventMutation.mutate({
        name,
        description: description || undefined,
        order: orderValue,
      });
    } else {
      // Update existing event
      if (currentEventId) {
        updateEventMutation.mutate({
          id: currentEventId,
          name,
          description: description || undefined,
          order: orderValue,
        });
      }
    }
  };

  // Show loading state while fetching data
  if (eventsLoading) {
    return (
      <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
        <h2 className="mb-4 text-2xl font-bold text-white">Manage Events</h2>
        <p className="text-gray-300">Loading events...</p>
      </div>
    );
  }

  // Show error state if data fetching failed
  if (eventsError) {
    return (
      <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
        <h2 className="mb-4 text-2xl font-bold text-white">Manage Events</h2>
        <p className="text-red-400">Failed to load events</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/10 p-6 shadow-md backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold text-white">Manage Events</h2>

      {/* Event List */}
      <div className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Current Events
        </h3>
        {events && events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-white">{event.name}</h4>
                  {event.description && (
                    <p className="mt-1 text-sm text-gray-300">
                      {event.description}
                    </p>
                  )}
                  {event.order !== null && (
                    <p className="mt-1 text-xs text-gray-400">
                      Order: {event.order}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex space-x-2">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="rounded-md bg-blue-600/30 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-600/50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(event)}
                    className="rounded-md bg-red-600/30 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-600/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300">No events available yet.</p>
        )}
      </div>

      {/* Add/Edit Event Form */}
      <div
        id="event-form"
        className="rounded-md border border-white/10 bg-white/5 p-4"
      >
        <h3 className="mb-4 text-lg font-semibold text-white">
          {formMode === "add" ? "Add New Event" : "Edit Event"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Name */}
          <div>
            <label
              htmlFor="event-name"
              className="mb-1 block text-sm font-medium text-gray-200"
            >
              Event Name*
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          {/* Event Description */}
          <div>
            <label
              htmlFor="event-description"
              className="mb-1 block text-sm font-medium text-gray-200"
            >
              Description (Optional)
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Event Order */}
          <div>
            <label
              htmlFor="event-order"
              className="mb-1 block text-sm font-medium text-gray-200"
            >
              Display Order (Optional)
            </label>
            <input
              id="event-order"
              type="number"
              value={order === undefined ? "" : order}
              onChange={(e) =>
                setOrder(
                  e.target.value === "" ? undefined : parseInt(e.target.value),
                )
              }
              className="w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Events are displayed in ascending order. Leave blank for default
              ordering.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 rounded-md px-4 py-2 font-medium transition-colors ${
                isSubmitting
                  ? "cursor-not-allowed bg-purple-400"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isSubmitting
                ? formMode === "add"
                  ? "Adding Event..."
                  : "Updating Event..."
                : formMode === "add"
                  ? "Add Event"
                  : "Update Event"}
            </button>
            {formMode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`mt-4 rounded p-3 ${
            message.type === "success" ? "bg-green-500/30" : "bg-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-white">
              Confirm Delete
            </h3>
            <p className="mb-6 text-gray-300">
              Are you sure you want to delete the event "{eventToDelete.name}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 font-medium transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
