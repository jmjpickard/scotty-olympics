"use client";

import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  onPhotoCapture: (photoBlob: Blob) => void;
}

/**
 * Component for capturing photos directly in the browser
 * Uses the MediaDevices API to access the user's camera
 */
export const CameraCapture = ({ onPhotoCapture }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize camera when component mounts
  useEffect(() => {
    const startCamera = async () => {
      try {
        setError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError(
          "Could not access camera. Please ensure you've granted camera permissions.",
        );
      }
    };

    startCamera();

    // Cleanup function to stop the camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // Take a photo from the video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      setError("Camera not ready. Please try again.");
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        setError("Could not initialize canvas context.");
        setIsCapturing(false);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas to a data URL
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);

      // Convert data URL to Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onPhotoCapture(blob);
          } else {
            setError("Failed to process captured image.");
          }
          setIsCapturing(false);
        },
        "image/jpeg",
        0.8,
      );
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("Failed to capture photo. Please try again.");
      setIsCapturing(false);
    }
  };

  // Retake photo by clearing the captured image
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  return (
    <div className="camera-capture">
      {error && (
        <div className="mb-4 rounded bg-red-500/30 p-3 text-sm">{error}</div>
      )}

      <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-full border-4 border-[hsl(280,100%,70%)] shadow-lg">
        {!capturedImage ? (
          // Video preview when no image is captured
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          // Show captured image
          <img
            src={capturedImage}
            alt="Captured"
            className="h-full w-full object-cover"
          />
        )}

        {/* Hidden canvas for processing the image */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="mt-4 flex space-x-4">
        {!capturedImage ? (
          <button
            onClick={capturePhoto}
            disabled={isCapturing || !stream}
            className={`w-full rounded-md px-4 py-2 font-medium transition-colors ${
              isCapturing || !stream
                ? "cursor-not-allowed bg-gray-400"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isCapturing ? "Capturing..." : "Take Photo"}
          </button>
        ) : (
          <div className="flex w-full space-x-4">
            <button
              onClick={retakePhoto}
              className="flex-1 rounded-md bg-gray-600 px-4 py-2 font-medium transition-colors hover:bg-gray-700"
            >
              Retake
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
