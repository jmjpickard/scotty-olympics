"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { CameraCapture } from "~/app/_components/user/CameraCapture";
import { createBrowserClient } from "~/lib/supabase/client";

/**
 * Welcome page for participants who have been invited
 * This is the landing page when a participant clicks on their invitation link
 */
// Component that uses useSearchParams
function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [supabase] = useState(() => createBrowserClient());

  // Initialize the mutations at component level
  const createParticipantMutation =
    api.participant.createOrGetParticipant.useMutation();
  const updateAvatarUrlMutation = api.participant.updateAvatarUrl.useMutation();
  const setUserPasswordMutation = api.participant.setUserPassword.useMutation();

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
      if (!participantData?.email) {
        throw new Error("Participant email not found");
      }

      // 1. Use our server-side procedure to set the password for the user
      // This uses the admin API and will work even if the user already exists
      const passwordResult = await setUserPasswordMutation.mutateAsync({
        email: participantData.email,
        password: password,
      });

      if (!passwordResult.success) {
        throw new Error("Failed to set password");
      }

      const userId = passwordResult.userId;

      // 2. Upload the photo to Supabase Storage if available
      let avatarUrl = null;
      if (photo) {
        console.log("[Join] Photo blob available, attempting to upload...");
        const fileName = `${userId}/avatar-${Date.now()}.jpg`;
        console.log(`[Join] Generated filename: ${fileName}`);

        try {
          // Explicitly await the upload operation
          const { data: uploadData, error: uploadError } =
            await supabase.storage.from("avatars").upload(fileName, photo);

          if (uploadError) {
            console.error("Error uploading avatar:", uploadError);
            console.error("Upload error details:", JSON.stringify(uploadError));
            throw new Error(`Upload failed: ${uploadError.message}`);
          } else if (uploadData) {
            console.log("[Join] Upload successful:", uploadData);

            // Explicitly await getting the public URL
            const { data: urlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(fileName);

            avatarUrl = urlData.publicUrl;
            console.log(`[Join] Got public URL: ${avatarUrl}`);
          } else {
            console.error("[Join] Upload completed but no data returned");
          }
        } catch (uploadErr) {
          console.error("[Join] Exception during upload:", uploadErr);
        }
      } else {
        console.log("[Join] No photo blob available to upload");
      }

      // 3. Update the participant record with the user ID and avatar URL
      if (token && participantData) {
        // Create or get participant
        await createParticipantMutation.mutateAsync({
          userId: userId,
          email: participantData.email,
          name: name,
        });

        // Update avatar URL if available
        if (avatarUrl) {
          console.log(
            `[Join] Updating avatar URL for user ${userId} to ${avatarUrl}`,
          );
          try {
            // Explicitly await the avatar URL update
            const avatarUpdateResult =
              await updateAvatarUrlMutation.mutateAsync({
                userId: userId,
                avatarUrl: avatarUrl,
              });
            console.log(
              `[Join] Avatar URL update successful:`,
              avatarUpdateResult,
            );

            // Add a small delay to ensure database update is complete
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (avatarError) {
            console.error(`[Join] Error updating avatar URL:`, avatarError);
            // Continue with the sign-up process even if avatar update fails
          }
        } else {
          console.log(`[Join] No avatar URL to update for user ${userId}`);
        }
      }

      // 4. Sign in the user with the new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: participantData.email,
        password: password,
      });

      if (signInError) {
        console.error("Error signing in:", signInError);
        // Continue anyway since we've updated the account
      }

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
              <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                <img
                  src="/harry.png"
                  alt="Harry"
                  className="h-full w-full object-cover"
                />
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
                className="focus:ring-greek-gold w-full rounded-md bg-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2"
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
                className="focus:ring-greek-gold w-full rounded-md bg-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2"
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
          <h1 className="mb-6 text-center text-3xl font-bold text-white">
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
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
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

// Main page component with Suspense boundary
export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
          <div className="border-greek-gold/30 w-full max-w-md rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
            <h1 className="mb-6 text-center text-3xl font-bold text-white">
              Scotty <span className="text-greek-gold">Olympics</span>
            </h1>
            <div className="flex justify-center">
              <div className="border-t-greek-gold h-8 w-8 animate-spin rounded-full border-4 border-white"></div>
            </div>
          </div>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
