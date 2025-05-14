"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface GameIconProps {
  onActivate: () => void;
}

/**
 * A hidden icon that, when clicked multiple times in succession,
 * reveals the hidden "Row Harder!" game
 */
export const GameIcon: React.FC<GameIconProps> = ({ onActivate }) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const REQUIRED_CLICKS = 3;
  const CLICK_TIMEOUT = 2000; // 2 seconds to reset click count

  // Reset click count after timeout
  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => {
        setClickCount(0);
      }, CLICK_TIMEOUT);

      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  const handleClick = () => {
    const now = Date.now();

    // If it's been too long since the last click, reset the count
    if (now - lastClickTime > CLICK_TIMEOUT) {
      setClickCount(1);
    } else {
      setClickCount((prev) => prev + 1);
    }

    setLastClickTime(now);

    // If we've reached the required number of clicks, activate the game
    if (clickCount + 1 >= REQUIRED_CLICKS) {
      onActivate();
      setClickCount(0);
    }
  };

  return (
    <div
      className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
      onClick={handleClick}
      title="Greek decoration"
    >
      <div className="relative h-8 w-8">
        <Image
          src="/oar-icon.svg" // We'll need to create this SVG
          alt="Greek decoration"
          width={32}
          height={32}
          className="transition-transform hover:rotate-12"
        />
        {clickCount > 0 && (
          <div className="bg-greek-gold absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
            {clickCount}
          </div>
        )}
      </div>
    </div>
  );
};
