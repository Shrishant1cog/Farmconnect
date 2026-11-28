import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/ui/Navbar';
import Providers from '../components/Providers';
import HarvestBackground from '../components/ui/HarvestBackground';
import Footer from '../components/ui/Footer';
import SkipLink from '../components/ui/SkipLink';
import { ModalProvider } from '../context/ModalContext';

// Plus Jakarta Sans is **self-hosted**.
//
// `next/font/google` downloads the font files while the site is built, so a
// build fails whenever Google Fonts cannot be reached — a transient network
// problem in CI is enough. The font file is part of the repository instead,
// which makes every build (local, CI and Render) reproducible and offline.
// The file is the variable latin subset of the font; the licence (SIL Open
// Font License 1.1) is next to it.
const jakarta = localFont({
  src: './fonts/PlusJakartaSans-Variable-latin.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '400 800',
  style: 'normal',
  fallback: ['system-ui', 'sans-serif'],
});

export const viewport: Viewport = {
  themeColor: '#092e20',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'FarmConnect | Direct Farmer Market & Logistics Exchange',
    template: '%s | FarmConnect',
  },
  description:
    'Direct agricultural procurement linking local farmers, bulk buyers, and retail consumers across Karnataka with transparent APMC mandi benchmarking.',
  keywords: [
    'Karnataka Agriculture',
    'Direct Farm Produce',
    'APMC Mandi Rates',
    'Organic Vegetables Mandya',
    'Farm-to-Door Logistics',
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans bg-stone-950 text-stone-900 antialiased selection:bg-emerald-800 selection:text-white relative">
        {/* Global Harvest Visualizer */}
        <div 
          aria-hidden="true" 
          className="fixed inset-0 -z-50 pointer-events-none overflow-hidden select-none transform-gpu will-change-transform"
        >
          <HarvestBackground />
        </div>

        <Providers>
          {/* Screen Reader Bypass — inside the providers because it is
              translated and therefore needs the locale context. */}
          <SkipLink />

          <ModalProvider>
            {/* Global Navigation */}
            <header className="relative z-30">
              <Navbar />
            </header>

            {/* Primary Viewport Area */}
            <main id="main-content" className="flex-1 w-full relative z-10 flex flex-col">
              {children}
            </main>

            {/* Platform Footer */}
            <Footer />
          </ModalProvider>
        </Providers>
      </body>
    </html>
  );
}