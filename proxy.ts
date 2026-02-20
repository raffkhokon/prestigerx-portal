import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge-compatible middleware — uses JWT only (no Prisma/Node.js APIs)
 * Protects all routes except /login and /api/auth/*
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow auth API and static assets
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Read JWT from cookie — edge-safe, no DB needed
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoginPage = pathname === '/login';

  // Not logged in → redirect to login
  if (!token && !isLoginPage) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in → redirect away from login
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/prescriptions', req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
