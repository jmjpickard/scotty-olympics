/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],
  // App Router is enabled by default in Next.js 15
  // Ensure no interference from Pages Router
  reactStrictMode: true,

  // Configure image domains to allow Supabase storage URLs
  images: {
    domains: [
      "phxbtunbketncixslxmq.supabase.co", // Supabase storage domain
    ],
  },
};

export default config;
