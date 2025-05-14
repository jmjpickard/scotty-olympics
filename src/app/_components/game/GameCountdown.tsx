"use client";

import { useEffect, useState } from "react";

interface GameCountdownProps {
  onComplete: () => void;
  startTime: Date;
}

/**
 * A countdown animation that displays 3-2-1 before the game starts
 */
export const GameCountdown: React.FC<GameCountdownProps> = ({
  onComplete,
  startTime,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    // Calculate initial time remaining
    const now = new Date();
    const initialTimeRemaining = Math.max(
      0,
      startTime.getTime() - now.getTime(),
    );
    setTimeRemaining(initialTimeRemaining);

    // Set up interval to update countdown
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, startTime.getTime() - now.getTime());
      setTimeRemaining(remaining);

      // Calculate countdown number (3, 2, 1)
      const countdownNumber = Math.ceil(remaining / 1000);
      setCountdown(countdownNumber > 0 ? countdownNumber : null);

      // If countdown is complete, call onComplete and clear interval
      if (remaining <= 0) {
        onComplete();
        clearInterval(interval);
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [startTime, onComplete]);

  // Calculate progress percentage for the progress bar
  const progressPercentage = Math.max(
    0,
    Math.min(100, (timeRemaining / 3000) * 100),
  );

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">Get Ready!</h2>
        <p className="text-gray-300">Game starting in...</p>
      </div>

      {countdown !== null ? (
        <div className="border-greek-gold bg-greek-blue-dark relative mb-8 flex h-32 w-32 items-center justify-center rounded-full border-4">
          <span
            className="animate-pulse text-6xl font-extrabold text-white"
            style={{
              animation: "pulse 0.5s infinite alternate",
            }}
          >
            {countdown}
          </span>
        </div>
      ) : (
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-full border-4 border-green-500 bg-green-900">
          <span className="text-3xl font-extrabold text-white">GO!</span>
        </div>
      )}

      <div className="relative h-4 w-64 overflow-hidden rounded-full bg-gray-700">
        <div
          className="bg-greek-gold absolute top-0 left-0 h-full transition-all duration-100"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-lg text-gray-300">
          Prepare to{" "}
          <span className="text-greek-gold font-bold">ROW HARDER!</span>
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Click/tap as fast as you can when the countdown ends
        </p>
      </div>
    </div>
  );
};
