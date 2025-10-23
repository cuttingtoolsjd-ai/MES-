/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    // These will be available at build time
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  },
  // Add any other Next.js config options here
  experimental: {
    // Enable if you need app directory (Next.js 13+)
    // appDir: true,
  },
  // Add domains if you plan to use next/image with external images
  images: {
    domains: [
      // Add external image domains here if needed
    ],
  },
}

module.exports = nextConfig