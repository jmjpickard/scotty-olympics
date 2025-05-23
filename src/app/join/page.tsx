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
        setError(
          "Participant email not found. Please try again or contact support.",
        );
        setIsLoading(false);
        return;
      }

      // Step 1: Set user password
      let userId = "";
      try {
        console.log("[Join] Setting user password...");
        const passwordResult = await setUserPasswordMutation.mutateAsync({
          email: participantData.email,
          password: password,
        });
        if (!passwordResult.success || !passwordResult.userId) {
          // If success is false, or userId is missing, throw a generic error.
          // Specific error messages would come from TRPCError if the mutation itself threw.
          throw new Error("Failed to set password. Please try again.");
        }
        userId = passwordResult.userId;
        console.log(`[Join] Password set successfully for userId: ${userId}`);
      } catch (err) {
        console.error("Error setting password:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to set password. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      // Step 2: Create or get participant record
      try {
        console.log(
          `[Join] Creating/getting participant record for userId: ${userId}`,
        );
        await createParticipantMutation.mutateAsync({
          userId: userId,
          email: participantData.email,
          name: name,
        });
        console.log(`[Join] Participant record ensured for userId: ${userId}`);
      } catch (err) {
        console.error("Error creating/getting participant:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to save participant details. Please try again.",
        );
        // Note: We might have a user in Supabase Auth but no participant record.
        // Depending on desired UX, could attempt to clean up or guide user.
        // For now, we stop and show an error.
        setIsLoading(false);
        return;
      }

      // Step 3: Upload photo and update avatar URL if photo exists
      let avatarUrl = null;
      if (photo) {
        console.log(
          `[Join] Photo blob available for userId: ${userId}, attempting to upload...`,
        );
        const fileName = `${userId}/avatar.jpg`; // Consistent filename
        const imageFile = new File([photo], "avatar.jpg", {
          type: "image/jpeg",
        });
        console.log(`[Join] Uploading ${fileName} to Supabase storage...`);

        try {
          const { data: uploadData, error: uploadError } =
            await supabase.storage.from("avatars").upload(fileName, imageFile, {
              cacheControl: "3600",
              upsert: true, // Use upsert for robust upload
            });

          if (uploadError) {
            console.error("Error uploading avatar to Supabase:", uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          if (uploadData) {
            console.log("[Join] Upload to Supabase successful:", uploadData);
            const { data: urlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(fileName);
            avatarUrl = urlData.publicUrl;
            console.log(`[Join] Got public URL: ${avatarUrl}`);
          } else {
            console.warn(
              "[Join] Supabase upload returned no data, but no error. Assuming success for URL retrieval.",
            );
            // Attempt to get URL anyway, Supabase sometimes behaves this way with upsert
            const { data: urlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(fileName);
            avatarUrl = urlData.publicUrl;
            if (avatarUrl) {
              console.log(`[Join] Got public URL after all: ${avatarUrl}`);
            } else {
              console.error(
                "[Join] Upload completed but no data and no public URL returned.",
              );
              throw new Error("Photo uploaded but could not retrieve its URL.");
            }
          }
        } catch (uploadErr) {
          console.error("[Join] Exception during photo upload:", uploadErr);
          setError(
            uploadErr instanceof Error
              ? `Photo upload failed: ${uploadErr.message}`
              : "Photo upload failed. Please try again.",
          );
          // Continue signup even if photo fails, but don't update avatar URL
          avatarUrl = null;
        }

        if (avatarUrl) {
          try {
            console.log(
              `[Join] Updating avatar URL for userId ${userId} to ${avatarUrl}`,
            );
            await updateAvatarUrlMutation.mutateAsync({
              userId: userId,
              avatarUrl: avatarUrl,
            });
            console.log(
              `[Join] Avatar URL update successful for userId: ${userId}`,
            );
          } catch (avatarError) {
            console.error(
              `[Join] Error updating avatar URL in DB:`,
              avatarError,
            );
            setError(
              avatarError instanceof Error
                ? `Failed to save avatar: ${avatarError.message}`
                : "Failed to save avatar. Your photo was uploaded but not linked to your profile.",
            );
            // Continue signup, photo is uploaded but not linked.
          }
        }
      } else {
        console.log(
          `[Join] No photo blob available to upload for userId: ${userId}`,
        );
      }

      // Step 4: Sign in the user
      console.log(
        `[Join] Attempting to sign in user: ${participantData.email}`,
      );
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: participantData.email,
        password: password,
      });

      if (signInError) {
        console.error("Error signing in after signup:", signInError);
        // Don't block redirect if sign-in fails, user can sign in manually.
        // setError(`Account created, but auto sign-in failed: ${signInError.message}. Please try logging in manually.`);
      } else {
        console.log(
          `[Join] User ${participantData.email} signed in successfully.`,
        );
      }

      setIsLoading(false);
      // Step 5: Redirect to Olympics page
      console.log("[Join] Signup complete, redirecting to /olympics...");
      void router.push("/olympics");
    } catch (err) {
      // This is a fallback catch for unexpected errors not caught by specific steps.
      console.error("Critical error during signup process:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during signup. Please try again.",
      );
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
                  src="/harry.jpg"
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
