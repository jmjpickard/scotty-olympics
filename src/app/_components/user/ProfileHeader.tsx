"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AvatarUpload } from "./AvatarUpload";
import type { User } from "@supabase/supabase-js";
import { api } from "~/trpc/react";
import { toast } from "sonner"; // Assuming sonner is used for notifications

interface ProfileHeaderProps {
  participant: {
    id: string;
    name?: string | null;
    email?: string;
    avatarUrl?: string | null;
    isAdmin?: boolean;
  };
  isOwnProfile: boolean;
  currentUser: User | null;
  totalPoints: number;
  rank: number;
}

export const ProfileHeader = ({
  participant,
  isOwnProfile,
  currentUser,
  totalPoints,
  rank,
}: ProfileHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(participant.name ?? "");
  const [currentParticipantName, setCurrentParticipantName] = useState(
    participant.name ?? "Athlete",
  );

  const utils = api.useUtils();
  const updateNameMutation = api.user.updateName.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsEditing(false);
      setCurrentParticipantName(data.name ?? "Athlete");
      // Invalidate relevant queries to refetch data, e.g., participant data
      void utils.participant.getParticipantWithScores.invalidate({
        participantId: participant.id,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update name.");
    },
  });

  const handleSave = () => {
    if (name.trim() === "") {
      toast.error("Name cannot be empty.");
      return;
    }
    if (name === participant.name) {
      setIsEditing(false); // No change, just exit editing mode
      return;
    }
    updateNameMutation.mutate({ name });
  };

  // Update local name state if participant prop changes
  useEffect(() => {
    setName(participant.name ?? "");
    setCurrentParticipantName(participant.name ?? "Athlete");
  }, [participant.name]);

  return (
    <div className="border-greek-gold/30 mb-8 rounded-lg border bg-white/10 p-6 shadow-md">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        <div className="flex flex-col items-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/20">
            <Image
              src={participant.avatarUrl ?? "/default-avatar.png"}
              alt={participant.name ?? "Profile"}
              width={128}
              height={128}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Handle image load error
                (e.target as HTMLImageElement).src = "/default-avatar.png";
              }}
            />
          </div>

          {isOwnProfile && currentUser && (
            <div className="mt-4 w-full">
              <AvatarUpload
                userId={currentUser.id}
                currentAvatarUrl={participant.avatarUrl ?? undefined}
              />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded bg-white/20 px-3 py-2 text-xl font-bold text-white"
                  />
                  <button
                    onClick={handleSave}
                    className="bg-greek-blue hover:bg-greek-blue-light rounded px-3 py-1 text-sm"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold break-all md:text-3xl">
                  {currentParticipantName}
                  {participant.isAdmin && (
                    <span className="ml-2 rounded bg-purple-600 px-2 py-1 text-xs font-normal">
                      Admin
                    </span>
                  )}
                </h1>
              )}
              {participant.email && (
                <p className="mt-1 text-sm break-all text-gray-300">
                  {participant.email}
                </p>
              )}
            </div>

            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-greek-blue hover:bg-greek-blue-light ml-2 shrink-0 rounded px-4 py-2 text-sm"
              >
                Edit Profile
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="ml-2 shrink-0 rounded bg-gray-500 px-3 py-1 text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded bg-white/5 p-4 text-center">
              <p className="text-sm text-gray-300">Rank</p>
              <p className="text-2xl font-bold">
                {rank === 1 && "🥇"}
                {rank === 2 && "🥈"}
                {rank === 3 && "🥉"}
                {rank > 3 && `#${rank}`}
              </p>
            </div>
            <div className="rounded bg-white/5 p-4 text-center">
              <p className="text-sm text-gray-300">Total Points</p>
              <p className="text-2xl font-bold">{totalPoints}</p>
            </div>
            <div className="col-span-2 rounded bg-white/5 p-4 text-center sm:col-span-1">
              <p className="text-sm text-gray-300">Participant ID</p>
              <p className="truncate font-mono text-xs">{participant.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
