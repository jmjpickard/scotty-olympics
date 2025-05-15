"use client";

import { useState, useEffect, useRef } from "react";
import { RowingAnimation } from "./RowingAnimation";

interface GamePlayProps {
  gameId: string;
  isActive: boolean;
  onUpdateTapCount: (tapCount: number) => void; // This will still be used for periodic updates
  timeRemaining: number;
  tapCount: number; // Added: current tap count from parent
  setTapCount: (updater: (prevTapCount: number) => number) => void; // Added: setter from parent
}

/**
 * The main button mashing interface for the "Row Harder!" game
 */
export const GamePlay: React.FC<GamePlayProps> = ({
  gameId,
  isActive,
  onUpdateTapCount,
  timeRemaining,
  tapCount, // Added
  setTapCount, // Added
}) => {
  // const [tapCount, setTapCount] = useState<number>(0); // Removed: Managed by parent
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [tapsPerSecond, setTapsPerSecond] = useState<number>(0);
  const tapAreaRef = useRef<HTMLDivElement>(null);
  const tapsInCurrentSecond = useRef<number>(0);
  const lastSecondTimestamp = useRef<number>(Date.now());

  // Handle tap/click on the mashing area
  const handleTap = () => {
    if (!isActive) return;

    // Increment tap count
    setTapCount((prev) => prev + 1);
    tapsInCurrentSecond.current += 1;

    // Add visual feedback
    if (tapAreaRef.current) {
      // Create ripple effect
      const ripple = document.createElement("div");
      ripple.className =
        "absolute bg-white/30 rounded-full animate-ripple pointer-events-none";

      // Random position within the tap area
      const size = Math.floor(Math.random() * 40) + 20; // 20-60px
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);

      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}%`;
      ripple.style.top = `${y}%`;

      tapAreaRef.current.appendChild(ripple);

      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 1000);
    }
  };

  // Calculate taps per second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastSecondTimestamp.current;

      if (elapsed >= 1000) {
        setTapsPerSecond(tapsInCurrentSecond.current);
        tapsInCurrentSecond.current = 0;
        lastSecondTimestamp.current = now;
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Update server with tap count periodically
  useEffect(() => {
    if (!isActive) return;

    const now = Date.now();
    // Only update every 500ms to avoid too many requests
    if (now - lastUpdateTime > 500) {
      onUpdateTapCount(tapCount);
      setLastUpdateTime(now);
    }
  }, [tapCount, isActive, onUpdateTapCount, lastUpdateTime]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex w-full items-center justify-between px-4">
        <div className="text-center">
          <div className="text-sm text-gray-400">Taps</div>
          <div className="text-2xl font-bold text-white">{tapCount}</div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-400">Speed</div>
          <div className="text-2xl font-bold text-white">{tapsPerSecond}/s</div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-400">Time</div>
          <div className="text-2xl font-bold text-white">
            {formatTimeRemaining(timeRemaining)}
          </div>
        </div>
      </div>

      <RowingAnimation tapCount={tapCount} isActive={isActive} />

      <div
        ref={tapAreaRef}
        onClick={handleTap}
        className="relative mt-6 flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 transition-colors select-none hover:border-gray-500 hover:bg-gray-700 active:bg-gray-600"
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-white">TAP HERE</div>
          <div className="mt-2 text-sm text-gray-400">
            Click or tap as fast as you can!
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ripple {
          animation: ripple 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
