"use client";

import { useEffect, useRef, useState } from "react";

interface RowingAnimationProps {
  tapCount: number;
  isActive: boolean;
}

/**
 * A visual animation of a Greek trireme (ship) with animated oars
 * that respond to the player's tapping speed
 */
export const RowingAnimation: React.FC<RowingAnimationProps> = ({
  tapCount,
  isActive,
}) => {
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [shipPosition, setShipPosition] = useState<number>(0);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const baseSpeed = 0.5; // Base speed in pixels per millisecond
  const maxSpeed = 3; // Maximum speed multiplier
  const deceleration = 0.95; // Rate at which speed decreases
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate animation speed based on tap count
  useEffect(() => {
    if (isActive && tapCount > 0) {
      // Increase speed based on tap count, but cap it at maxSpeed
      const newSpeed = Math.min(1 + tapCount / 50, maxSpeed);
      setAnimationSpeed(newSpeed);
    }
  }, [tapCount, isActive]);

  // Animation loop
  const animate = (time: number) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }

    const deltaTime = time - previousTimeRef.current;
    previousTimeRef.current = time;

    // Update ship position
    if (isActive) {
      setShipPosition((prevPosition) => {
        // Move ship based on current speed
        return prevPosition + baseSpeed * animationSpeed * deltaTime;
      });

      // Gradually decrease speed (simulates water resistance)
      setAnimationSpeed((prevSpeed) => prevSpeed * deceleration);
    }

    // Draw the animation
    drawAnimation();

    // Continue animation loop
    requestRef.current = requestAnimationFrame(animate);
  };

  // Draw the ship and oars on the canvas
  const drawAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate ship position within the canvas (loop when it goes off-screen)
    const shipX = (shipPosition % (canvas.width + 100)) - 100;

    // Draw water
    ctx.fillStyle = "#3b82f6"; // Blue water
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Draw ship hull
    ctx.fillStyle = "#8B4513"; // Brown hull
    ctx.beginPath();
    ctx.moveTo(shipX + 20, canvas.height - 50);
    ctx.lineTo(shipX + 120, canvas.height - 50);
    ctx.lineTo(shipX + 100, canvas.height - 30);
    ctx.lineTo(shipX + 40, canvas.height - 30);
    ctx.closePath();
    ctx.fill();

    // Draw ship deck
    ctx.fillStyle = "#A0522D"; // Darker brown deck
    ctx.fillRect(shipX + 30, canvas.height - 60, 80, 10);

    // Draw mast
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(shipX + 70, canvas.height - 90, 5, 40);

    // Draw sail
    ctx.fillStyle = "#F5F5DC"; // Beige sail
    ctx.beginPath();
    ctx.moveTo(shipX + 75, canvas.height - 90);
    ctx.lineTo(shipX + 95, canvas.height - 70);
    ctx.lineTo(shipX + 75, canvas.height - 50);
    ctx.closePath();
    ctx.fill();

    // Draw oars with animation
    const oarCount = 5;
    const oarSpacing = 15;
    const oarLength = 30;
    const oarWidth = 3;
    const oarPhaseOffset = Math.PI / 4; // Offset between oars

    for (let i = 0; i < oarCount; i++) {
      // Calculate oar position and angle
      const oarX = shipX + 40 + i * oarSpacing;
      const oarY = canvas.height - 40;

      // Animate oar angle based on time and position
      const angle = Math.sin(shipPosition / 20 + i * oarPhaseOffset) * 0.3;

      // Draw oar
      ctx.save();
      ctx.translate(oarX, oarY);
      ctx.rotate(angle);
      ctx.fillStyle = "#D2B48C"; // Tan oar
      ctx.fillRect(0, 0, oarLength, oarWidth);
      ctx.restore();
    }

    // Draw wake behind the ship
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 5; i++) {
      const wakeX = shipX - 10 - i * 5;
      const wakeSize = 5 - i;
      ctx.beginPath();
      ctx.arc(wakeX, canvas.height - 35, wakeSize, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Start/stop animation based on isActive
  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      // Reset animation state
      setAnimationSpeed(1);
      setShipPosition(0);
      previousTimeRef.current = 0;

      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive]);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
      <canvas ref={canvasRef} width={400} height={150} className="w-full" />
      {isActive && (
        <div className="mt-2 text-center text-sm text-gray-400">
          <span className="font-bold text-white">{tapCount}</span> taps
          {animationSpeed > 1.5 && (
            <span className="ml-2 text-green-400">
              {animationSpeed > 2.5
                ? "Incredible speed!"
                : animationSpeed > 2
                  ? "Great rowing!"
                  : "Keep going!"}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
