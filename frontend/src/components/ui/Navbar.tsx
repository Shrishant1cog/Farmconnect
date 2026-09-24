'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sprout, 
  Home, 
  ShoppingBag, 
  TrendingUp, 
  MapPin, 
  LogIn, 
  UserPlus, 
  LogOut, 
  User, 
  MessageSquare,
  Loader2 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; path=/; max-age=0';
      document.cookie = 'fc_token=; path=/; max-age=0';
      document.cookie = 'farmconnect_token=; path=/; max-age=0';
      document.cookie = 'farmconnect_role=; path=/; max-age=0';
      document.cookie = 'role=; path=/; max-age=0';
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('farmconnect_token');
      localStorage.removeItem('fc_token');
      localStorage.removeItem('farmconnect_role');
      localStorage.removeItem('farmconnect_user');
      localStorage.removeItem('fc_user');
    }
    if (logout) logout();
    router.push('/login');
  };

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Marketplace', href: '/consumer/explore', icon: ShoppingBag },
    { name: 'Mandi Rates', href: '/mandi-rates', icon: TrendingUp },
    { name: 'Farm Map', href: '/consumer/map', icon: MapPin },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-stone-900 block leading-none">
              FarmConnect
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase block mt-0.5">
              Direct Agri Exchange
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isLoading ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              {user.role === 'FARMER' && (
                <Link
                  href="/farmer/dashboard"
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Farmer Hub
                </Link>
              )}
              {user.role === 'CONSUMER' && (
                <Link
                  href="/consumer/orders"
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
                >
                  My Orders
                </Link>
              )}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-stone-900 block leading-none">
                  {user.name || 'User'}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mt-0.5">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Register
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}