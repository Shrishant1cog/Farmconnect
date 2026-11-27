import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '../components/ui/Navbar';
import Providers from '../components/Providers';
import HarvestBackground from '../components/ui/HarvestBackground';
import Footer from '../components/ui/Footer';
import SkipLink from '../components/ui/SkipLink';
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