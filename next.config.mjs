/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Note: Removed 'output: export' because NextAuth requires server-side API routes
  // For Capacitor, use a deployed server or local dev server
  images: {
    unoptimized: false, // Re-enabled for better image optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Disable trailing slash redirects to prevent 308 redirects on /api/auth/session
  trailingSlash: false,
  // Turbopack configuration for Next.js 16
  // Since we removed aws-sdk (no longer needed after removing phone OTP),
  // we don't need webpack config anymore
  turbopack: {},
};

export default nextConfig;
