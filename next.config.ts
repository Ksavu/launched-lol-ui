/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'tan-worthy-zebra-831.mypinata.cloud',
      },
      {
        protocol: 'https',
        hostname: '**.mypinata.cloud',
      },
    ],
    // Allow loopback in development
    ...(process.env.NODE_ENV === 'development' && {
      dangerouslyAllowSVG: true,
      contentDispositionType: 'attachment',
      unoptimized: true,
    }),
  },
};

export default nextConfig;