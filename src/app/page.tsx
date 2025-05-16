import Link from "next/link";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          {/* Greek column decoration */}
          <div className="w-full max-w-4xl">
            {/* Title with laurel wreath */}
            <h1 className="relative text-center text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              <span className="mb-2 inline-block">🏛️</span>
              <br />
              Scotty{"'"}s <span className="text-greek-gold">Olympics</span>
            </h1>
          </div>

          {/* Placeholder for Harry&apos;s image */}
          <div className="border-greek-gold relative mb-4 h-72 w-72 overflow-hidden rounded-full border-4 shadow-lg sm:h-96 sm:w-96">
            <div className="absolute inset-0 flex items-center justify-center bg-white/10">
              <img
                src="/harry.jpg"
                alt="Harry"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Hero text */}
          <p className="mb-6 max-w-2xl text-center text-xl text-white/80">
            It's Harry Scott's stag. Let's play a few games and have a laugh.
            <br />
          </p>

          {/* CTA Buttons with improved styling */}
          <div className="flex">
            <Link
              className="border-greek-gold/30 from-greek-blue to-greek-blue-dark hover:bg-greek-blue flex transform flex-col gap-4 rounded-xl border bg-gradient-to-r p-6 shadow-lg transition-all hover:scale-105"
              href="/olympics"
            >
              <h3 className="flex items-center text-2xl font-bold">
                <span className="mr-2">🏆</span> Enter the Games
              </h3>
              <div className="text-lg">
                Check out the events, scores, and leaderboard for the Scotty
                Olympics.
              </div>
            </Link>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
