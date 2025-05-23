"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { createBrowserClient } from "~/lib/supabase/client";
import { InviteForm } from "../_components/admin/InviteForm";
import { ScoreEntryForm } from "../_components/admin/ScoreEntryForm";
import { EventManagementForm } from "../_components/admin/EventManagementForm";
import { AvatarUpload } from "../_components/user/AvatarUpload";
import { ChatBox } from "../_components/chat/ChatBox";
import { useRouter, useSearchParams } from "next/navigation";
import { GameIcon } from "../_components/game/GameIcon";
import { GameModal } from "../_components/game/GameModal";
import type { User } from "@supabase/supabase-js"; // Import User type

// Define participant profile type based on Prisma schema
export interface ParticipantProfile {
  id: string;
  userId?: string | null;
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  inviteToken?: string | null;
  inviteTokenExpiry?: Date | null;
  createdAt?: Date;
}

// Define leaderboard entry type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface LeaderboardEntry {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
  totalPoints: number;
}

// Define props interface
interface OlympicsContentProps {
  initialUser: User | null;
  initialProfile: ParticipantProfile | null;
}

/**
 * Main content component for the Olympics page
 * Shows leaderboard, events, and admin functionality when applicable
 */
export default function OlympicsContent({
  initialUser,
  initialProfile,
}: OlympicsContentProps) {
  // Only log once during initialization, not on every render
  const hasLoggedRef = useRef(false);

  if (!hasLoggedRef.current) {
    console.log(
      "[Client] Initializing OlympicsContent with initialProfile:",
      initialProfile,
    );
    console.log("[Client] Initial admin status:", initialProfile?.isAdmin);
    console.log(
      "[Client] Admin email from env:",
      process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    );
    console.log("[Client] User email:", initialUser?.email);
    console.log(
      "[Client] Email match?",
      initialUser?.email?.toLowerCase() ===
        process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase(),
    );
    hasLoggedRef.current = true;
  }

  const [supabase] = useState(() => createBrowserClient());
  // Initialize state based on props from Server Component
  const [user, setUser] = useState<User | null>(initialUser);
  const [isAdmin, setIsAdmin] = useState(initialProfile?.isAdmin ?? false);
  const [userProfile, setUserProfile] = useState<ParticipantProfile | null>(
    initialProfile,
  );

  // Track if we've already checked admin status for the current user
  const adminCheckRef = useRef<string | null>(null);

  // Check admin status when user changes
  useEffect(() => {
    // Skip if no user or if we've already checked this user
    if (!user || adminCheckRef.current === user.id) return;

    console.log("[Client] Checking admin status for user:", user.id);

    // Mark this user as checked
    adminCheckRef.current = user.id;

    // Force admin status if email matches admin email
    if (user.email && process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      const isEmailMatch =
        user.email.toLowerCase() ===
        process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase();

      if (isEmailMatch && !isAdmin) {
        console.log(
          "[Client] Email matches admin email but isAdmin is false. Forcing admin status.",
        );
        setIsAdmin(true);
      }
    }
  }, [user]); // Only run when user changes to prevent infinite loops
  // isLoading might not be needed if initial state is always provided,
  // but keep it for onAuthStateChange updates for now.
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("game");

  // Check for game parameter in URL and show game modal if present
  useEffect(() => {
    if (gameIdParam && userProfile) {
      setShowGameModal(true);
    }
  }, [gameIdParam, userProfile]);
  const router = useRouter();

  // Fetch events data
  const {
    data: events,
    isLoading: isLoadingEvents,
    error: errorEvents,
  } = api.event.getAll.useQuery();

  // Fetch leaderboard data
  const {
    data: leaderboardData,
    isLoading: isLoadingLeaderboard,
    error: errorLeaderboard,
  } = api.score.getLeaderboardData.useQuery();

  // Get tRPC context for query invalidation
  const utils = api.useContext();

  // Create participant mutation
  const createParticipantMutation =
    api.participant.createOrGetParticipant.useMutation({
      onSuccess: (data) => {
        setUserProfile(data);
        setIsAdmin(data?.isAdmin ?? false);
        setShowWelcomeMessage(true);

        // Hide welcome message after 5 seconds
        setTimeout(() => {
          setShowWelcomeMessage(false);
        }, 5000);
      },
      onError: (error) => {
        console.error("Failed to create participant:", error);
        // Add error state handling if needed
        setUserProfile(null);
        setIsAdmin(false);
      },
    });

  // Set up realtime subscription to scores table
  useEffect(() => {
    // Ensure Supabase client is available
    if (!supabase) return;

    // Define a function to handle score changes
    const handleScoreChange = (payload: {
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }): void => {
      // Type-safe logging by explicitly accessing properties
      console.log("Score change received!", {
        new: payload.new,
        old: payload.old,
      });
      // Invalidate the leaderboard query to trigger a refetch
      void utils.score.getLeaderboardData.invalidate();
    };

    // Create a channel specific to this subscription
    const channel = supabase
      .channel("public:scores") // Unique channel name
      .on(
        "postgres_changes", // Listen to database changes
        {
          event: "*", // Listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "scores", // Specifically listen to the scores table
        },
        handleScoreChange, // Callback function
      );

    // Subscribe to the channel
    void channel.subscribe();

    // Cleanup function to remove the channel subscription when the component unmounts
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, utils]); // Dependencies: run effect if supabase client or utils change

  // Track if we've already created a participant for the current user
  const participantCreatedRef = useRef<string | null>(null);

  // Listen for auth changes and ensure participant record exists
  useEffect(() => {
    let isMounted = true;

    // Handle auth state changes
    const authListener = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser); // Update user state

        if (currentUser && participantCreatedRef.current !== currentUser.id) {
          // Check if we need to create a participant for this user
          const needsParticipant =
            !userProfile || userProfile.userId !== currentUser.id;

          if (needsParticipant) {
            console.log(
              "[Client] Creating participant for user:",
              currentUser.id,
            );

            // Set flag to prevent multiple creation attempts
            participantCreatedRef.current = currentUser.id;

            // User is logged in, ensure participant record exists via mutation
            try {
              const participantData =
                await createParticipantMutation.mutateAsync({
                  userId: currentUser.id,
                  email: currentUser.email ?? "", // Provide email
                  name:
                    (currentUser.user_metadata?.full_name as string) ??
                    currentUser.email, // Provide name
                });

              // Explicitly set isAdmin from the returned participant data
              if (participantData) {
                setIsAdmin(participantData.isAdmin);
                console.log("Admin status set:", participantData.isAdmin);
              }
            } catch (error) {
              console.error("Failed to create participant:", error);
              // Reset flag if creation fails to allow retry
              participantCreatedRef.current = null;
            }
          }
        } else if (!currentUser) {
          // User is logged out, clear profile and admin status
          setUserProfile(null);
          setIsAdmin(false);
          participantCreatedRef.current = null;
        }

        // Refresh router cache on auth state changes
        if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
          void router.refresh();
        }
      },
    );

    return () => {
      isMounted = false;
      authListener.data.subscription?.unsubscribe();
    };
  }, [supabase, router, createParticipantMutation]); // Removed userProfile from dependencies

  /**
   * Handles user sign out
   */
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      void router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <main className="bg-greek-gradient flex min-h-screen flex-col overflow-x-hidden text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="relative z-10">
          {/* Welcome message notification */}
          {showWelcomeMessage && (
            <div className="relative mb-4 rounded-md border border-green-500/30 bg-green-800/30 p-4 shadow-md">
              <button
                onClick={() => setShowWelcomeMessage(false)}
                className="absolute top-2 right-2 text-white/60 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
              <div className="flex items-start">
                <div className="mr-3 flex-shrink-0">
                  <span className="text-2xl">🎉</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    Welcome to Scotty Olympics!
                  </h3>
                  <p className="mt-1 text-green-200">
                    Your athlete profile has been created. You can now
                    participate in events and track your progress.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-greek-gold/30 mb-12 flex flex-col items-center justify-between gap-6 border-b pb-6 sm:flex-row">
            <div className="flex items-center">
              <div className="mr-2">
                <GameIcon onActivate={() => setShowGameModal(true)} />
              </div>
              <div>
                <h1 className="flex items-center text-center text-4xl font-extrabold tracking-tight sm:text-left sm:text-5xl">
                  <span className="mr-3 text-3xl">🏛️</span> Scotty{" "}
                  <span className="text-greek-gold">Olympics</span>
                </h1>
                <p className="mt-2 max-w-md text-center text-sm text-gray-300 sm:text-left sm:text-base">
                  The ultimate competition of skill, strategy, and sportsmanship
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Use the 'user' state derived from props/onAuthStateChange */}
              {user ? (
                <>
                  <div className="mr-2 hidden items-center sm:flex">
                    <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                      <span className="text-sm">👤</span>
                    </div>
                    <span className="text-sm text-gray-300">{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="rounded-md border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-white/20"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  className="bg-greek-blue hover:bg-greek-blue-light rounded-md px-4 py-2 font-semibold text-white shadow-sm transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Admin Section - Only visible to admin */}
          {isAdmin && (
            <div className="border-greek-gold/30 bg-greek-blue-dark/40 mb-12 rounded-lg border p-6 shadow-lg">
              <h2 className="mb-4 flex items-center text-2xl font-bold">
                <span className="mr-2">⚙️</span> Admin Controls
              </h2>
              <p className="text-greek-white/80 mb-6 text-sm">
                As an admin, you can invite new athletes, update competition
                scores, and manage events.
              </p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <InviteForm />
                <ScoreEntryForm />
                <EventManagementForm />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Leaderboard */}
            <div className="border-greek-gold/30 rounded-lg border bg-white/10 p-6 shadow-md">
              <h2 className="mb-4 flex items-center text-2xl font-bold">
                <span className="mr-2">🏆</span> Leaderboard
              </h2>
              {isLoadingLeaderboard ? (
                <div className="flex flex-col items-center py-8">
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
                  <p className="text-gray-300">Loading leaderboard data...</p>
                </div>
              ) : errorLeaderboard ? (
                <div className="rounded-md border border-red-500/30 bg-red-900/20 p-4 text-center">
                  <p className="font-medium text-red-300">
                    Failed to load leaderboard
                  </p>
                  <p className="mt-2 text-sm text-red-400">
                    Please try refreshing the page
                  </p>
                </div>
              ) : leaderboardData && leaderboardData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                          Rank
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                          Athlete
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium tracking-wider text-gray-300 uppercase">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {leaderboardData.map((participant, index) => {
                        // Determine medal class based on ranking
                        let medalClass = "";
                        let medalEmoji = "";

                        if (index === 0) {
                          medalClass = "bg-greek-gold/30 font-bold"; // Gold
                          medalEmoji = "🥇";
                        } else if (index === 1) {
                          medalClass = "bg-gray-400/30 font-bold"; // Silver
                          medalEmoji = "🥈";
                        } else if (index === 2) {
                          medalClass = "bg-greek-terracotta/30 font-bold"; // Bronze
                          medalEmoji = "🥉";
                        }

                        return (
                          <tr
                            key={participant.id}
                            className={`transition hover:bg-white/5 ${medalClass}`}
                          >
                            <td className="px-3 py-2 text-sm whitespace-nowrap">
                              {medalEmoji} {index + 1}
                            </td>
                            <td className="px-3 py-2 text-sm whitespace-nowrap">
                              <Link
                                href={`/profile/${participant.id}`}
                                className="hover:text-greek-gold flex items-center transition-colors"
                              >
                                <Image
                                  src={
                                    participant.avatarUrl ??
                                    "/default-avatar.png"
                                  }
                                  alt={participant.name ?? "Participant"}
                                  className="mr-3 rounded-full border-2 border-white/20 object-cover"
                                  width={32}
                                  height={32}
                                  onError={(e) => {
                                    // Handle image load error
                                    (e.target as HTMLImageElement).src =
                                      "/default-avatar.png";
                                  }}
                                />
                                {participant.name ?? "Anonymous"}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap">
                              {participant.totalPoints}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-300">
                  No leaderboard data available yet.
                </p>
              )}
            </div>

            {/* Events */}
            <div className="border-greek-gold/30 rounded-lg border bg-white/10 p-6 shadow-md">
              <h2 className="mb-4 flex items-center text-2xl font-bold">
                <span className="mr-2">🏃‍♂️</span> Events
              </h2>
              {isLoadingEvents ? (
                <div className="flex flex-col items-center py-8">
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
                  <p className="text-gray-300">Loading events data...</p>
                </div>
              ) : errorEvents ? (
                <div className="rounded-md border border-red-500/30 bg-red-900/20 p-4 text-center">
                  <p className="font-medium text-red-300">
                    Failed to load events
                  </p>
                  <p className="mt-2 text-sm text-red-400">
                    Please try refreshing the page
                  </p>
                </div>
              ) : events && events.length > 0 ? (
                <ul className="space-y-3">
                  {events.map((event, index) => (
                    <li
                      key={event.id}
                      className="border-greek-gold/30 rounded-md border bg-white/5 p-4 transition hover:bg-white/10"
                    >
                      <div className="flex items-start">
                        <div className="bg-greek-blue mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold text-white">
                          {index + 1}
                        </div>
                        <div>
                          <Link
                            href={`/event/${event.id}`}
                            className="hover:text-greek-gold transition-colors"
                          >
                            <h3 className="text-lg font-semibold">
                              {event.name}
                            </h3>
                          </Link>
                          {event.description && (
                            <p className="mt-1 text-sm text-gray-300">
                              {event.description}
                            </p>
                          )}
                          <div className="mt-2">
                            <Link
                              href={`/event/${event.id}`}
                              className="text-greek-gold text-sm hover:underline"
                            >
                              View event details →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300">No events available yet.</p>
              )}
            </div>

            {/* Chat Section - Replacing the User Profile */}
            <ChatBox user={user} />
          </div>

          {/* Game Modal */}
          {showGameModal && userProfile && (
            <GameModal
              onClose={() => setShowGameModal(false)}
              initialGameId={gameIdParam ?? undefined}
              _userId={user?.id ?? ""}
              participantId={userProfile.id}
            />
          )}

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center rounded-md bg-white/20 px-5 py-3 font-semibold text-white shadow-md transition hover:bg-white/30"
            >
              <span className="mr-2">🏠</span> Back to Home
            </Link>

            {/* Debug button - only visible in development */}
            {process.env.NODE_ENV !== "production" && (
              <div className="mt-6 rounded-md border border-yellow-500/30 bg-yellow-900/20 p-4 text-left">
                <h3 className="mb-2 text-lg font-semibold">
                  Debug Information
                </h3>
                <pre className="overflow-auto rounded bg-black/30 p-2 text-xs">
                  {JSON.stringify(
                    {
                      isAdmin,
                      initialProfileIsAdmin: initialProfile?.isAdmin,
                      userEmail: user?.email,
                      userId: user?.id,
                      userProfileId: userProfile?.id,
                      adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
                    },
                    null,
                    2,
                  )}
                </pre>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      console.log("Current user:", user);
                      console.log("Current profile:", userProfile);
                      console.log("Admin status:", isAdmin);
                      console.log(
                        "Admin email:",
                        process.env.NEXT_PUBLIC_ADMIN_EMAIL,
                      );
                      alert(`Admin status: ${isAdmin ? "YES" : "NO"}`);
                    }}
                    className="rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-500"
                  >
                    Log Debug Info
                  </button>
                  <button
                    onClick={() => {
                      setIsAdmin(true);
                    }}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-500"
                  >
                    Force Admin: ON
                  </button>
                  <button
                    onClick={() => {
                      setIsAdmin(false);
                    }}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500"
                  >
                    Force Admin: OFF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
