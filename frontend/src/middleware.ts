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

  // 4. PROTECTED ACCOUNT PAGES — the favourites, the inbox and the
  //    account of the visitor. Without a session they have nothing to
  //    show, so the visitor is sent to the sign-in page (and comes back
  //    to the page he wanted).
  if (
    !token &&
    (pathname.startsWith('/profile') ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/consumer/favorites'))
  ) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};