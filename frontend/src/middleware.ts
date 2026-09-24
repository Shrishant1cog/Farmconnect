import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('farmconnect_token')?.value;
  const rawRole = request.cookies.get('farmconnect_role')?.value;
  const userRole = (rawRole || '').trim().toUpperCase();

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isFarmerRoute = pathname.startsWith('/farmer');
  const isConsumerRoute = pathname.startsWith('/consumer');
  const isCheckoutRoute = pathname.startsWith('/checkout');

  // 1. Redirect authenticated users away from login/register
  if (isAuthRoute && token) {
    const destination = userRole === 'FARMER' ? '/farmer/dashboard' : '/consumer/explore';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 2. Strict Farmer Route Guard (Cultivators Only)
  if (isFarmerRoute) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== 'FARMER') {
      return NextResponse.redirect(new URL('/consumer/explore', request.url));
    }
  }

  // 3. Strict Consumer Route Guard (Buyers Only — Farmers blocked from ordering)
  if (isConsumerRoute || isCheckoutRoute) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== 'CONSUMER') {
      return NextResponse.redirect(new URL('/farmer/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/farmer/:path*',
    '/consumer/:path*',
    '/checkout',
  ],
};