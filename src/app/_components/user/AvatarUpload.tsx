"use client";

import { useState } from "react";
import { createBrowserClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";

/**
 * Component for users to upload and manage their profile avatar
 * Handles file selection, upload to Supabase storage, and database update
 */
export const AvatarUpload = ({
  userId,
  currentAvatarUrl,
}: {
  userId: string;
  currentAvatarUrl?: string;
}) => {
  const [supabase] = useState(() => createBrowserClient());
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl ?? null,
  );

  // Mutation to update avatar URL in the database
  const updateAvatarMutation = api.user.updateAvatarUrl.useMutation({
    onSuccess: () => {
      setMessage({ text: "Avatar updated successfully!", type: "success" });
      setIsUploading(false);
    },
    onError: (error: { message: string }) => {
      setMessage({
        text: `Failed to update profile: ${error.message}`,
        type: "error",
      });
      setIsUploading(false);
    },
  });

  /**
   * Handles file selection and creates a preview
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous messages
    setMessage(null);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please select an image file", type: "error" });
      return;
    }

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    void handleUpload(file);
  };

  /**
   * Handles file upload to Supabase storage
   */
  const handleUpload = async (file: File) => {
    if (!userId) {
      setMessage({
        text: "You must be logged in to upload an avatar",
        type: "error",
      });
      return;
    }

    console.log(`[handleUpload] START - User: ${userId}`);

    setIsUploading(true);

    try {
      // Create a unique filename with user ID
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

      console.log(
        `[handleUpload] Uploading to Supabase storage - Path: ${filePath}`,
      );

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error(
          `[handleUpload] Error uploading to Supabase storage - Path: ${filePath}`,
        );
        throw new Error(uploadError.message);
      }

      console.log(
        `[handleUpload] Uploaded to Supabase storage - Path: ${filePath}`,
      );

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update user profile with new avatar URL
      void updateAvatarMutation.mutate({ avatarPath: filePath });
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({
        text:
          error instanceof Error ? error.message : "Failed to upload avatar",
        type: "error",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="avatar-upload mt-4">
      <div className="flex items-center space-x-6">
        <div className="avatar-preview">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="h-24 w-24 rounded-full object-cover"
              onError={() => setPreviewUrl("/default-avatar.png")}
            />
          ) : (
            <img
              src="/default-avatar.png"
              alt="Default avatar"
              className="h-24 w-24 rounded-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col">
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Profile Picture
          </label>

          <label
            htmlFor="avatar-upload"
            className={`cursor-pointer rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 ${
              isUploading ? "opacity-50" : ""
            }`}
          >
            {isUploading ? "Uploading..." : "Change Avatar"}
          </label>

          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          <p className="mt-1 text-xs text-gray-300">
            JPG, PNG or GIF. Max 2MB.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 rounded p-3 text-sm ${
            message.type === "success" ? "bg-green-500/30" : "bg-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};
