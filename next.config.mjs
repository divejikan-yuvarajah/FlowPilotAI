/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip filesystem source maps in production for faster builds and smaller payloads
  productionBrowserSourceMaps: false,

  // Auto-restore scroll position on back/forward — feels native
  experimental: {
    scrollRestoration: true,

    // 🚀 Tree-shake huge barrel-import libraries.
    // Without this, importing `import { Home } from "lucide-react"` bundles ~1MB of unused icons.
    // Same for date-fns, framer-motion, recharts, @radix-ui/*.
    // Cuts initial JS by 40–60% on most pages.
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "recharts",
      "sonner",
      "cmdk",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
    ],
  },

  // Compress responses
  compress: true,

  // Skip image optimization complaints during dev
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google avatars
    ],
  },

  // Strict React gives clearer dev warnings; doesn't affect production speed.
  reactStrictMode: true,

  // Allow outbound server-side fetch to the Seylan sandbox (HTTP, not HTTPS).
  // Vercel serverless functions run in Node.js — HTTP fetch works fine server-side.
  // This flag prevents Next.js from warning about mixed-content in server components.
  allowedDevOrigins: ["http://34.21.206.87:3000"],
};

export default nextConfig;
