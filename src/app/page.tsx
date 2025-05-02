import Link from "next/link";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          {/* Title with laurel wreath */}
          <h1 className="text-5xl font-extrabold tracking-tight text-center sm:text-[5rem]">
            <span className="inline-block mb-2">🏛️</span><br />
            Scotty <span className="text-[hsl(280,100%,70%)]">Olympics</span>
          </h1>
          
          {/* Placeholder for Harry's image */}
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 mb-4 overflow-hidden rounded-full border-4 border-[hsl(280,100%,70%)] shadow-lg">
            {/* Replace with actual Harry's image when available */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/10 text-center p-4">
              <p className="text-lg font-semibold">
                [Placeholder for Harry's Olympic photo]
              </p>
            </div>
          </div>
          
          {/* Hero text */}
          <p className="text-xl text-center max-w-2xl mb-6 text-white/80">
            Join the most prestigious sporting event in Scotty's realm. Compete for glory, honor, and bragging rights!
          </p>
          
          {/* CTA Buttons with improved styling */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 max-w-3xl w-full">
            <Link
              className="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-amber-600/70 to-amber-700/70 p-6 shadow-lg hover:from-amber-500/70 hover:to-amber-600/70 transition-all transform hover:scale-105 border border-amber-500/30"
              href="/olympics"
            >
              <h3 className="text-2xl font-bold flex items-center">
                <span className="mr-2">🏆</span> Enter the Games
              </h3>
              <div className="text-lg">
                Check out the events, scores, and leaderboard for the Scotty Olympics.
              </div>
            </Link>
            <Link
              className="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-purple-600/70 to-purple-700/70 p-6 shadow-lg hover:from-purple-500/70 hover:to-purple-600/70 transition-all transform hover:scale-105 border border-purple-500/30"
              href="/auth"
            >
              <h3 className="text-2xl font-bold flex items-center">
                <span className="mr-2">🏅</span> Join as Athlete
              </h3>
              <div className="text-lg">
                Sign in to view your profile, update your avatar, and track your Olympic journey.
              </div>
            </Link>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
