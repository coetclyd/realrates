import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Serves free-licence recipe photos from our own domain so recipe importers can fetch them.
  async rewrites() {
    return [{ source: '/recipe-img/:path*', destination: 'https://upload.wikimedia.org/:path*' }];
  },
};
export default nextConfig;
