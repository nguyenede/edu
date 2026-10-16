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
        destination: '/app/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/app/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard/:path*',
        destination: '/app/dashboard/:path*',
        permanent: false,
      },
      {
        source: '/games',
        destination: '/app/games',
        permanent: false,
      },
      {
        source: '/games/:path*',
        destination: '/app/games/:path*',
        permanent: false,
      },
      {
        source: '/documents',
        destination: '/app/documents',
        permanent: false,
      },
      {
        source: '/documents/:path*',
        destination: '/app/documents/:path*',
        permanent: false,
      },
      {
        source: '/classes',
        destination: '/app/classes',
        permanent: false,
      },
      {
        source: '/classes/:path*',
        destination: '/app/classes/:path*',
        permanent: false,
      },
      {
        source: '/question-bank',
        destination: '/app/question-bank',
        permanent: false,
      },
      {
        source: '/question-bank/:path*',
        destination: '/app/question-bank/:path*',
        permanent: false,
      },
      {
        source: '/results',
        destination: '/app/results',
        permanent: false,
      },
      {
        source: '/results/:path*',
        destination: '/app/results/:path*',
        permanent: false,
      },
      {
        source: '/notifications',
        destination: '/app/notifications',
        permanent: false,
      },
      {
        source: '/notifications/:path*',
        destination: '/app/notifications/:path*',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/app/settings',
        permanent: false,
      },
      {
        source: '/settings/:path*',
        destination: '/app/settings/:path*',
        permanent: false,
      },
      {
        source: '/si',
        destination: '/app/si',
        permanent: false,
      },
      {
        source: '/si/:path*',
        destination: '/app/si/:path*',
        permanent: false,
      },
      {
        source: '/help',
        destination: '/app/help',
        permanent: false,
      },
      {
        source: '/help/:path*',
        destination: '/app/help/:path*',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
