'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sprout, 
  Home, 
  ShoppingBag, 
  ShoppingCart,
  TrendingUp, 
  MapPin, 
  LogIn, 
  UserPlus, 
  LogOut, 
  User, 
  MessageSquare,
  Bell,
  Heart,
  Loader2 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
import { useCart } from '../../context/CartContext';
import { useAccount } from '../../context/AccountContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { t } = useI18n();

  /**
   * The cart of the visitor.
   *
   * The cart used to be invisible: the marketplace filled it, the
   * checkout read it, but **nothing** in the interface showed that it
   * existed. A buyer who had just chosen a lot had no way to reach the
   * checkout except by typing its address. The entry with the number of
   * the lots closes that gap.
   */
  const cart = useCart();
  const cartCount = cart?.totalItemsCount ?? 0;

  /**
   * The notices of the platform and the favourites of the buyer.
   *
   * Both numbers are read from the shared backend by
   * `AccountProvider` — the navbar never counts anything itself.
   */
  const account = useAccount();
  const unreadCount = account?.unreadCount ?? null;
  const favoriteCount =
    (account?.favoriteProductIds?.length ?? 0) +
    (account?.favoriteFarmerIds?.length ?? 0);

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
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.marketplace'), href: '/consumer/explore', icon: ShoppingBag },
    { name: t('nav.liveTrade'), href: '/buy', icon: MessageSquare },
    { name: t('nav.mandiRates'), href: '/mandi-rates', icon: TrendingUp },
    { name: t('nav.farmMap'), href: '/consumer/map', icon: MapPin },
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
              {t('app.tagline')}
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
          <LanguageSwitcher />
          {isLoading ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/checkout"
                className="relative p-2 rounded-xl text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                title={t('nav.cart')}
                aria-label={t('nav.cartWithCount', { count: cartCount })}
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-700 text-white text-[10px] font-black flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/*
                The notices of the platform. The badge carries the number
                that the **shared backend** counted — a number it did not
                give is no badge at all, never a wrong one.
              */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-xl text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                title={t('nav.notifications')}
                aria-label={t('nav.notificationsWithCount', { count: unreadCount ?? 0 })}
              >
                <Bell className="w-4 h-4" />
                {unreadCount !== null && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* The favourites of a buyer. */}
              {user.role === 'CONSUMER' && (
                <Link
                  href="/consumer/favorites"
                  className="relative p-2 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={t('nav.favorites')}
                  aria-label={t('nav.favoritesWithCount', { count: favoriteCount })}
                >
                  <Heart className="w-4 h-4" />
                  {favoriteCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                      {favoriteCount > 99 ? '99+' : favoriteCount}
                    </span>
                  )}
                </Link>
              )}

              {/* The account of the visitor. */}
              <Link
                href="/profile"
                className="p-2 rounded-xl text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                title={t('nav.profile')}
                aria-label={t('nav.profile')}
              >
                <User className="w-4 h-4" />
              </Link>
              {user.role === 'FARMER' && (
                <Link
                  href="/farmer/dashboard"
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  {t('nav.farmerHub')}
                </Link>
              )}
              {user.role === 'CONSUMER' && (
                <Link
                  href="/consumer/orders"
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
                >
                  {t('nav.myOrders')}
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
                title={t('nav.signOut')}
                aria-label={t('nav.signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/checkout"
                className="relative p-2 rounded-xl text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                title={t('nav.cart')}
                aria-label={t('nav.cartWithCount', { count: cartCount })}
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-700 text-white text-[10px] font-black flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> {t('nav.signIn')}
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> {t('nav.register')}
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}