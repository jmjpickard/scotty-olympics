"use client";

import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";

import { createBrowserClient } from "~/lib/supabase/client";

export default function AuthPage() {
  const [supabase] = useState(() => createBrowserClient());
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setTimeout(() => {
          router.refresh();
          router.push("/olympics");
        }, 100);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <div className="bg-greek-gradient flex min-h-screen flex-col items-center justify-center p-4">
      <div className="border-greek-gold/30 w-full max-w-md rounded-lg border bg-white/10 p-8 shadow-xl backdrop-blur-sm">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          Welcome to Scotty <span className="text-greek-gold">Olympics</span>
        </h1>
        <div className="auth-container">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#0D5EAF", // Greek blue
                    brandAccent: "#0A4A8A", // Darker blue
                    inputBorder: "#D4AF37", // Greek gold
                    inputBorderHover: "#F2D675", // Lighter gold
                    inputBorderFocus: "#D4AF37", // Greek gold
                  },
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
}
