import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: frontendRoot,
  },
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
