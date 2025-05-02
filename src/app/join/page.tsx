"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { CameraCapture } from "~/app/_components/user/CameraCapture";

/**
 * Welcome page for participants who have been invited
 * This is the landing page when a participant clicks on their invitation link
 */
export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate the invitation token
  const [isValidToken, setIsValidToken] = useState(true);
  const [participantData, setParticipantData] = useState<{
    id: string;
    email: string;
    name: string | null;
  } | null>(null);

  // Query to validate the token
  const tokenValidation = api.participant.validateInviteToken.useQuery(
    { token: token ?? "" },
    {
      enabled: !!token,
      retry: false,
    },
  );

  // Handle token validation result
  useEffect(() => {
    if (tokenValidation.isSuccess && tokenValidation.data) {
      setIsValidToken(true);
      setParticipantData(tokenValidation.data.participant);
      // Pre-fill the name field if available
      if (tokenValidation.data.participant.name) {
        setName(tokenValidation.data.participant.name);
      }
    } else if (tokenValidation.isError && tokenValidation.error) {
      console.error("Token validation error:", tokenValidation.error);
      setIsValidToken(false);
      setError(
        tokenValidation.error.message ??
          "Invalid invitation link. Please contact the administrator for a new invitation.",
      );
    }
  }, [
    tokenValidation.isSuccess,
    tokenValidation.isError,
    tokenValidation.data,
    tokenValidation.error,
  ]);

  // If no token is provided, show an error
  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      setError(
        "Invalid invitation link. Please contact the administrator for a new invitation.",
      );
    }
  }, [token]);

  // Handle form submission to move to the next step
  const handleNextStep = () => {
    if (step === 0) {
      // From welcome to name input
      setStep(1);
    } else if (step === 1) {
      // Validate name
      if (!name.trim()) {
        setError("Please enter your name");
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      // From photo to password
      setStep(3);
    } else if (step === 3) {
      // Validate password
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      setError(null);
      void handleCompleteSignup();
    }
  };

  // Handle the final signup step
  const handleCompleteSignup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, we would:
      // 1. Validate the invitation token
      // 2. Create the user in Supabase Auth
      // 3. Upload the photo to Supabase Storage
      // 4. Update the participant record with the user ID and avatar URL

      // For demonstration purposes, we'll simulate a successful signup
      // and redirect to the Olympics page

      if (photo) {
        console.log("Photo captured successfully, size:", photo.size);
        // Here we would upload the photo to Supabase Storage
      }

      console.log("Creating user with name:", name);
      // Here we would create the user in Supabase Auth

      // Simulate API call delay
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));

      // Redirect to Olympics page
      void router.push("/olympics");
    } catch (err) {
      console.error("Error during signup:", err);
      setError("An error occurred during signup. Please try again.");
      setIsLoading(false);
    }
  };

  // Render the appropriate step
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center">
            <div className="border-greek-gold relative mx-auto mb-6 h-48 w-48 overflow-hidden rounded-full border-4 shadow-lg">
              {/* Replace with actual Harry&apos;s image when available */}
              <div className="absolute inset-0 flex items-center justify-center bg-white/10 p-4 text-center">
                <p className="text-lg font-semibold">[Harry&apos;s Photo]</p>
              </div>
            </div>
            <h2 className="mb-4 text-2xl font-bold">
              Welcome to Scotty Olympics!
            </h2>
            <p className="mb-6">
              You&apos;ve been invited to join the most prestigious sporting
              event in Scotty&apos;s realm.
            </p>
            <button
              onClick={handleNextStep}
              className="bg-greek-blue hover:bg-greek-blue-light w-full rounded-md px-4 py-2 font-medium transition-colors"
            >
              Join as Participant
            </button>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="mb-4 text-2xl font-bold">Choose Your Name</h2>
            <p className="mb-6">
              How would you like to be known in the Scotty Olympics?
            </p>

            <div className="mb-4">
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="focus:ring-greek-gold w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:outline-none"
                placeholder="Enter your name"
                required
              />
            </div>

            {error && (
              <div className="mb-4 rounded bg-red-500/30 p-3">{error}</div>
            )}

            <button
              onClick={handleNextStep}
              className="bg-greek-blue hover:bg-greek-blue-light w-full rounded-md px-4 py-2 font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="mb-4 text-2xl font-bold">Take Your Photo</h2>
            <p className="mb-6">Let&apos;s capture your Olympic spirit!</p>

            <CameraCapture
              onPhotoCapture={(photoBlob) => {
                setPhoto(photoBlob);
                // Automatically proceed to next step after capturing photo
                void setTimeout(() => handleNextStep(), 1000);
              }}
            />

            {photo && (
              <div className="mt-4">
                <button
                  onClick={handleNextStep}
                  className="bg-greek-blue hover:bg-greek-blue-light w-full rounded-md px-4 py-2 font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="mb-4 text-2xl font-bold">Create a Password</h2>
            <p className="mb-6">
              Set a password to secure your Olympic account.
            </p>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-200"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus:ring-greek-gold w-full rounded-md bg-white/20 px-3 py-2 text-white focus:ring-2 focus:outline-none"
                placeholder="Enter a password"
                required
              />
              <p className="mt-1 text-xs text-gray-300">
                Must be at least 6 characters
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded bg-red-500/30 p-3">{error}</div>
            )}

            <button
              onClick={handleNextStep}
              disabled={isLoading}
              className={`w-full rounded-md px-4 py-2 font-medium transition-colors ${
                isLoading
                  ? "bg-greek-blue-light/70 cursor-not-allowed"
                  : "bg-greek-blue hover:bg-greek-blue-light"
              }`}
            >
              {isLoading ? "Creating Account..." : "Complete Sign Up"}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
        <div className="border-greek-gold/30 w-full max-w-md rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="greek-column-header mb-6 text-center text-3xl font-bold text-white">
            Invalid Invitation
          </h1>
          <div className="mb-6 rounded bg-red-500/30 p-3">
            {error ??
              "Invalid invitation link. Please contact the administrator for a new invitation."}
          </div>
          <Link
            href="/"
            className="bg-greek-blue hover:bg-greek-blue-light block w-full rounded-md px-4 py-2 text-center font-medium transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
      <div className="border-greek-gold/30 w-full max-w-md rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
        <h1 className="greek-column-header mb-6 text-center text-3xl font-bold text-white">
          Scotty <span className="text-greek-gold">Olympics</span>
        </h1>

        {/* Progress indicator */}
        {step > 0 && (
          <div className="mb-6">
            <div className="mb-2 flex justify-between">
              <span className="text-xs text-gray-300">Step {step} of 3</span>
              <span className="text-xs text-gray-300">
                {Math.round((step / 3) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-700">
              <div
                className="bg-greek-gold h-2 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  );
}
