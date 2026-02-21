import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public API routes that don't require authentication
const publicApiRoutes = [
  '/api/admin/bootstrap',
  '/api/admin/check-db',
  '/api/debug/users-exist',
  '/api/ping',
  '/api/auth',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow everything else (NextAuth will handle auth protection)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
