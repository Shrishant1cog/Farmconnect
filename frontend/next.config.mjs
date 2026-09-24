/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/seller',
        destination: '/farmer/dashboard',
        permanent: true,
      },
      {
        source: '/seller/orders',
        destination: '/farmer/orders',
        permanent: true,
      },
      {
        source: '/buy',
        destination: '/checkout',
        permanent: true,
      },
      {
        source: '/consumer/chats',
        destination: '/consumer/enquiries',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;