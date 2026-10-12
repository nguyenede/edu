/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/app',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/app/:path*',
        destination: '/:path*',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
