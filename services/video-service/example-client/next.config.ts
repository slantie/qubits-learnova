import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: '10000mb',
  },
  async rewrites() {
    return [
      {
        source: '/api/video-service/:path*',
        destination: 'localhost:4001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
