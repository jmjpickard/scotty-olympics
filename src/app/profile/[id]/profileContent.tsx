"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ProfileHeader } from "~/app/_components/user/ProfileHeader";
import { ScoreHistory } from "~/app/_components/user/ScoreHistory";
import type { User } from "@supabase/supabase-js";

interface ProfileContentProps {
  profileId: string;
  currentUser: User | null;
}

export default function ProfileContent({
  profileId,
  currentUser,
}: ProfileContentProps) {
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Fetch participant data with scores
  const {
    data: participantData,
    isLoading: isLoadingParticipant,
    error: participantError,
  } = api.participant.getParticipantWithScores.useQuery({
    participantId: profileId,
  });

  // Fetch participant rank
  const {
    data: rankData,
    isLoading: isLoadingRank,
    error: rankError,
  } = api.participant.getParticipantRank.useQuery({
    participantId: profileId,
  });

  // Determine if this is the current user's profile
  useEffect(() => {
    if (participantData?.participant && currentUser) {
      // Check if the participant is linked to the current user
      const isOwn = participantData.participant.userId === currentUser.id;
      setIsOwnProfile(isOwn);
    }
  }, [participantData, currentUser]);

  // Loading state
  if (isLoadingParticipant || isLoadingRank) {
    return (
      <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
          <p className="text-white">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (participantError || rankError) {
    return (
      <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
        <div className="border-greek-gold/30 w-full max-w-md rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="greek-column-header mb-6 text-center text-3xl font-bold text-white">
            Error Loading Profile
          </h1>
          <div className="mb-6 rounded bg-red-500/30 p-3 text-white">
            {participantError?.message ??
              rankError?.message ??
              "An error occurred while loading the profile."}
          </div>
          <Link
            href="/olympics"
            className="bg-greek-blue hover:bg-greek-blue-light block w-full rounded-md px-4 py-2 text-center font-medium text-white transition-colors"
          >
            Return to Olympics
          </Link>
        </div>
      </div>
    );
  }

  // If participant not found
  if (!participantData?.participant) {
    return (
      <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
        <div className="border-greek-gold/30 w-full max-w-md rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="greek-column-header mb-6 text-center text-3xl font-bold text-white">
            Profile Not Found
          </h1>
          <div className="mb-6 rounded bg-yellow-500/30 p-3 text-white">
            The participant profile you&apos;re looking for doesn&apos;t exist.
          </div>
          <Link
            href="/olympics"
            className="bg-greek-blue hover:bg-greek-blue-light block w-full rounded-md px-4 py-2 text-center font-medium text-white transition-colors"
          >
            Return to Olympics
          </Link>
        </div>
      </div>
    );
  }

  const { participant, totalPoints } = participantData;
  const rank = rankData?.rank ?? 0;

  return (
    <main className="bg-greek-gradient min-h-screen text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="greek-column-header text-3xl font-bold">
            {isOwnProfile ? "Your Profile" : "Athlete Profile"}
          </h1>
          <Link
            href="/olympics"
            className="bg-greek-blue hover:bg-greek-blue-light rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Back to Olympics
          </Link>
        </div>

        {/* Profile Header */}
        <ProfileHeader
          participant={participant}
          isOwnProfile={isOwnProfile}
          currentUser={currentUser}
          totalPoints={totalPoints}
          rank={rank}
        />

        {/* Score History */}
        <ScoreHistory participantId={profileId} />
      </div>
    </main>
  );
}
