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
      // Aliases of a real workspace. They are **temporary** (307) and not
      // permanent (308): a permanent redirect is cached by the browser
      // forever, so a destination that is moved or repaired later would
      // stay broken in every browser that had already visited it.
      {
        source: '/seller',
        destination: '/farmer/dashboard',
        permanent: false,
      },
      {
        source: '/seller/orders',
        destination: '/farmer/orders',
        permanent: false,
      },
      {
        source: '/consumer/chats',
        destination: '/consumer/enquiries',
        permanent: false,
      },
      // `/buy` is **not** redirected any more.
      //
      // It used to be:
      //
      //     { source: '/buy', destination: '/checkout', permanent: true }
      //
      // which made the whole "Geo-logistics and live trade hub" page
      // unreachable — the interactive farm map, the live negotiation chat
      // and the logistics profit drawer (`AgriMapExplorer`, `MapSideChat`
      // and `LogisticsProfitDrawer`) are used by that page **only**, so the
      // permanent redirect locked all three out of the deployed website.
      // The page reads the public `/apmc/rates` and `/products` endpoints
      // of the shared backend and works for a guest as well as for a
      // signed-in buyer.
    ];
  },
};

export default nextConfig;
