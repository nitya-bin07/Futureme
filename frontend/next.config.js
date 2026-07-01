/** @type {import('next').NextConfig} */

// In production, set NEXT_PUBLIC_API_URL (or just BACKEND_URL on the host)
// to your deployed backend's URL, e.g. https://api.yourdomain.com.
// Falls back to localhost for local development with no extra setup.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
