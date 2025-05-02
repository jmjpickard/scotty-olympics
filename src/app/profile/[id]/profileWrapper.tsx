"use client";

import { useParams } from "next/navigation";
import ProfileContent from "./profileContent";
import type { User } from "@supabase/supabase-js";

interface ProfileWrapperProps {
  currentUser: User | null;
}

export default function ProfileWrapper({ currentUser }: ProfileWrapperProps) {
  // Use the useParams hook to get the id parameter from the URL
  const params = useParams();
  const profileId = params.id as string;

  return <ProfileContent profileId={profileId} currentUser={currentUser} />;
}
