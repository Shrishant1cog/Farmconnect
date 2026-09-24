'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Sprout, ShoppingBag, MessageSquare, Package, 
  MapPin, Shield, Menu, X, LogOut, 
  Compass, TrendingUp, AlertTriangle, Loader2, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useCart } from '../../context/CartContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badgeCount?: number;
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const socket = useSocket();

  // Local state fallback to ensure name renders even before context fully hydrates
  const [currentUser, setCurrentUser] = useState<any>(authUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<number>(2); // Default incoming farmer alerts
  const [newOrderAlert, setNewOrderAlert] = useState<boolean>(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const isAuthPage = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/register');

  // Sync user state from context or localStorage immediately
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('farmconnect_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }, [authUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewMessage = () => setUnreadMessages((prev) => prev + 1);
    const handleNewOrder = () => setNewOrderAlert(true);

    socket.on('new_chat_message', handleNewMessage);
    socket.on('new_order_received', handleNewOrder);
    socket.on('new_notification', handleNewMessage);

    return () => {
      socket.off('new_chat_message', handleNewMessage);
      socket.off('new_order_received', handleNewOrder);
      socket.off('new_notification', handleNewMessage);
    };
  }, [socket, isAuthenticated]);

  useEffect(() => {
    if (pathname.includes('/orders')) {
      setNewOrderAlert(false);
    }
    if (pathname.includes('/chats') || pathname.includes('/enquiries')) {
      setUnreadMessages(0);
    }
  }, [pathname]);

  // Role-based Navigation Links (Replaced Inquiries with Chats)
  const navLinks = useMemo<NavItem[]>(() => {
    if (!isAuthenticated && !currentUser) {
      return [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Marketplace', href: '/consumer/explore', icon: Compass },
        { label: 'Mandi Rates', href: '/mandi-rates', icon: TrendingUp },
        { label: 'Farm Map', href: '/consumer/map', icon: MapPin },
      ];
    }

    if (currentUser?.role === 'FARMER') {
      return [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Harvest Hub', href: '/farmer/dashboard', icon: Sprout },
        { label: 'Active Produce', href: '/farmer/products', icon: Package },
        { 
          label: 'Customer Orders', 
          href: '/farmer/orders', 
          icon: ShoppingBag, 
          badgeCount: newOrderAlert ? 1 : 0 
        },
        { 
          label: 'Chats', 
          href: '/consumer/chats', 
          icon: MessageSquare, 
          badgeCount: unreadMessages 
        },
        { label: 'Marketplace', href: '/consumer/explore', icon: Compass },
        { label: 'Mandi Rates', href: '/mandi-rates', icon: TrendingUp },
      ];
    }

    if (currentUser?.role === 'ADMIN') {
      return [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Platform Console', href: '/admin/dashboard', icon: Shield },
        { label: 'Mandi Rates', href: '/mandi-rates', icon: TrendingUp },
      ];
    }

    // Consumer / Retail Buyer
    return [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Marketplace', href: '/consumer/explore', icon: Compass },
      { label: 'Mandi Rates', href: '/mandi-rates', icon: TrendingUp },
      { label: 'Farm Map', href: '/consumer/map', icon: MapPin },
      { label: 'My Orders', href: '/consumer/orders', icon: Package },
      { 
        label: 'Chats', 
        href: '/consumer/chats', 
        icon: MessageSquare, 
        badgeCount: unreadMessages 
      },
    ];
  }, [isAuthenticated, currentUser, unreadMessages, newOrderAlert]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('farmconnect_token');
      localStorage.removeItem('farmconnect_user');
      document.cookie = 'farmconnect_token=; path=/; max-age=0;';
      document.cookie = 'farmconnect_role=; path=/; max-age=0;';

      if (typeof logout === 'function') {
        await logout();
      }
      setShowLogoutConfirm(false);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Resolve user display name
  const userName = currentUser?.name || (currentUser?.role === 'FARMER' ? 'Ramesh Kumar' : 'Priya Narayanan');
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-white shadow-md shadow-emerald-950/10 group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-stone-900 block leading-none">
                Farm<span className="text-emerald-800">Connect</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
                Direct Agri Exchange
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' 
                ? pathname === '/' 
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Profile & Controls */}
          <div className="flex items-center gap-3">
            
            {/* Cart Button */}
            {(isAuthenticated || currentUser) && (
              <Link
                href="/checkout"
                className="relative p-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                aria-label="View Cart"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-800" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-700 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {totalItemsCount}
                  </span>
                )}
              </Link>
            )}

            {/* Top-Right User Badge (Always Shows Name) */}
            {(isAuthenticated || currentUser) ? (
              <div className="flex items-center gap-2.5 bg-stone-50 border border-stone-200/90 pl-2.5 pr-1.5 py-1 rounded-2xl shadow-2xs">
                
                {/* User Avatar Circle */}
                <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-[11px] font-black tracking-wider shadow-xs shrink-0">
                  {userInitials}
                </div>

                {/* Name & Role */}
                <div className="hidden sm:flex flex-col text-left pr-1">
                  <span className="text-xs font-black text-stone-900 leading-tight">
                    {userName}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                    currentUser?.role === 'FARMER' 
                      ? 'text-emerald-700' 
                      : currentUser?.role === 'ADMIN' 
                      ? 'text-purple-700' 
                      : 'text-blue-700'
                  }`}>
                    {currentUser?.role || 'BUYER'}
                  </span>
                </div>

                {/* Sign out button */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              !isAuthPage && (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-xs font-bold text-stone-700 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-all shadow-xs active:scale-95"
                  >
                    Register
                  </Link>
                </div>
              )
            )}

            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' 
                ? pathname === '/' 
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-900' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-black text-stone-900 tracking-tight">
                Sign Out of FarmConnect?
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                You will need to sign in again to access direct farmer chats and orders.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" /> Confirm Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;