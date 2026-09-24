import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve token from all supported cookie variations
  const token =
    request.cookies.get('token')?.value ||
    request.cookies.get('fc_token')?.value ||
    request.cookies.get('farmconnect_token')?.value;

  const role = (
    request.cookies.get('role')?.value ||
    request.cookies.get('farmconnect_role')?.value ||
    ''
  ).toUpperCase();

  // Public asset and API paths to bypass
  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/mandi-rates') ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.');

  // 1. If accessing protected farmer pages without a token
  if (!token && pathname.startsWith('/farmer')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If accessing protected consumer pages without a token
  if (!token && pathname.startsWith('/consumer')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. If accessing login/register while already logged in
  if (token && (pathname === '/login' || pathname === '/register')) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam) {
      try {
        const decoded = decodeURIComponent(redirectParam);
        if (decoded.startsWith('/') && !decoded.startsWith('//')) {
          return NextResponse.redirect(new URL(decoded, request.url));
        }
      } catch {
        // Fallback below
      }
    }
    const defaultTarget = role === 'FARMER' ? '/farmer/dashboard' : '/consumer/explore';
    return NextResponse.redirect(new URL(defaultTarget, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};