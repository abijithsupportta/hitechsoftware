import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/dashboard'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const { supabase, response } = createMiddlewareClient(request);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if ((error || !user) && isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch (err) {
    // Supabase unreachable or env var missing — allow through; AuthProvider handles client-side redirect
    console.error('[Proxy] Auth check failed, allowing request through:', err);
    return NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
