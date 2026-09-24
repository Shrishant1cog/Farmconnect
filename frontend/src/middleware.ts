import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token =
    request.cookies.get('token')?.value ||
    request.cookies.get('fc_token')?.value ||
    request.cookies.get('farmconnect_token')?.value;

  // 1. PUBLIC ROUTES: Always allow unauthenticated guest access
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/consumer/explore') ||
    pathname.startsWith('/consumer/map') ||
    pathname.startsWith('/mandi-rates') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/buy') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. PROTECTED FARMER WORKSPACE: Redirect unauthenticated visitors to login
  if (!token && pathname.startsWith('/farmer')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. PROTECTED CONSUMER ORDERS & CHECKOUT
  if (!token && (pathname.startsWith('/consumer/orders') || pathname.startsWith('/checkout'))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};