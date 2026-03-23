import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/dashboard'];
const AUTH_PREFIXES = ['/login'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const { supabase, response } = createMiddlewareClient(request);

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    const isAuthenticated = !!session;

    if (pathname === '/') {
      const destination = isAuthenticated ? '/dashboard' : '/login';
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if ((error || !isAuthenticated) && isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!error && isAuthenticated && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (err) {
    // Supabase unreachable or env var missing — allow through; AuthProvider handles client-side redirect
    console.error('[Proxy] Auth check failed, allowing request through:', err);
    return NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
