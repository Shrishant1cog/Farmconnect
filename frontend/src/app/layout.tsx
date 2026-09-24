import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/ui/Navbar';
import Providers from '../components/Providers';
import HarvestBackground from '../components/ui/HarvestBackground';
import { ModalProvider } from '../context/ModalContext';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
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
        {/* Screen Reader Bypass */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          Skip to main harvest content
        </a>

        {/* Global Harvest Visualizer */}
        <div 
          aria-hidden="true" 
          className="fixed inset-0 -z-50 pointer-events-none overflow-hidden select-none transform-gpu will-change-transform"
        >
          <HarvestBackground />
        </div>

        <Providers>
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
            <footer className="bg-stone-950/95 backdrop-blur-md text-stone-400 text-xs py-8 border-t border-stone-800/80 text-center relative z-20 mt-auto">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="tracking-tight">
                  © 2026 <strong>FarmConnect Karnataka</strong>. Transparent farm-to-door direct marketplace.
                </p>
                <p className="text-stone-500 font-medium">
                  Prices listed are direct <strong className="text-emerald-500">Farmer Listed Prices</strong> with zero broker deduction.
                </p>
              </div>
            </footer>
          </ModalProvider>
        </Providers>
      </body>
    </html>
  );
}