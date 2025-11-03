import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/bookings(.*)',
  '/admin(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/about',
  '/contact',
  '/unauthorized'
]);

const isTRPCRoute = createRouteMatcher(['/api/trpc(.*)']);

function hasAuthCookies(req: NextRequest) {
  const cookies = req.headers.get('cookie') ?? '';
  return cookies.includes('__clerk_db_jwt') || 
         cookies.includes('__session') || 
         cookies.includes('__clerk');
}

const staticFilePattern = /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf|eot|json|txt|xml|map)$/;

export default clerkMiddleware(async (auth, req) => {  
  if (req.nextUrl.pathname.startsWith('/_next') || staticFilePattern.exec(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (isTRPCRoute(req)) {
    return NextResponse.next();
  }

  try {
    const { userId, sessionClaims } = await auth();

    if (isAdminRoute(req)) {
      // Not signed in -> send to sign-in
      if (!userId) {
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }

      // Prefer checking role from Clerk session claims (fast, available in Edge)
      const clerkRole =
        (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.role as
          | string
          | undefined ??
        (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role as
          | string
          | undefined;

      if (clerkRole === 'admin' || clerkRole === 'super_admin') {
        return NextResponse.next();
      }

      // Fallback: query our server API for role (if Clerk metadata is not present).
      // Note: avoid forcing a sign-in on fetch errors; instead treat failures as unauthorized
      try {
        const response = await fetch(`${req.nextUrl.origin}/api/auth/role`, {
          method: 'GET',
          headers: {
            'x-user-id': userId,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Auth role endpoint returned non-OK status', response.status);
          const homeUrl = new URL('/', req.url);
          homeUrl.searchParams.set('error', 'unauthorized');
          homeUrl.searchParams.set('message', `Access denied. Unable to verify admin role.`);
          return NextResponse.redirect(homeUrl);
        }

        const userData = (await response.json()) as { role?: string };
        const userRole = userData?.role;

        if (userRole === 'admin' || userRole === 'super_admin') {
          return NextResponse.next();
        }

        // Not admin -> redirect to home with unauthorized message
        const homeUrl = new URL('/', req.url);
        homeUrl.searchParams.set('error', 'unauthorized');
        homeUrl.searchParams.set('message', `Access denied. Admin role required. Your role: ${userRole ?? 'user'}`);
        return NextResponse.redirect(homeUrl);
      } catch (error) {
        console.error('Error checking user role in middleware (fallback):', error);
        const homeUrl = new URL('/', req.url);
        homeUrl.searchParams.set('error', 'unauthorized');
        homeUrl.searchParams.set('message', `Access denied. Unable to verify admin role.`);
        return NextResponse.redirect(homeUrl);
      }
    }

    if (isProtectedRoute(req)) {
      if (userId || hasAuthCookies(req)) {
        return NextResponse.next();
      }
      
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware error:', error);
    
    if (isAdminRoute(req)) {
      if (hasAuthCookies(req)) {
        return NextResponse.next();
      }
      
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
    
    if (hasAuthCookies(req)) {
      return NextResponse.next();
    }
    
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    '/((?!_next|favicon.ico).*)',
  ],
};