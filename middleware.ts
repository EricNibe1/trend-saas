import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Check for Supabase auth token in cookies
  const allCookies = req.cookies.getAll();
  
  // Supabase stores auth in cookies like: sb-{project-ref}-auth-token
  const authCookie = allCookies.find(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  );
  
  const hasSession = !!authCookie?.value;
  const { pathname } = req.nextUrl;

  console.log('Middleware check:', { pathname, hasSession });

  // Protect all /app/* routes - redirect to /auth if not logged in
  if (pathname.startsWith('/app') && !hasSession) {
    console.log('Blocking access to', pathname, '- no session');
    const redirectUrl = new URL('/auth', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing /auth with a session, redirect to /app
  if (pathname === '/auth' && hasSession) {
    console.log('Already logged in, redirecting to /app');
    const redirectUrl = new URL('/app', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing root, redirect based on auth status
  if (pathname === '/') {
    const redirectUrl = new URL(hasSession ? '/app' : '/auth', req.url);
    console.log('Root access, redirecting to', redirectUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/app/:path*', '/auth'],
}
