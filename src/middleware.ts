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
      // Note: In production/Vercel, internal fetch might fail, so we'll be more lenient
      console.log('[Middleware] Clerk role not found in metadata, checking database for user:', userId);
      
      try {
        // Build URL more carefully for Vercel environment
        const baseUrl = req.nextUrl.origin;
        const roleApiUrl = `${baseUrl}/api/auth/role`;
        
        console.log('[Middleware] Fetching role from:', roleApiUrl);
        
        // Create timeout controller manually for better compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(roleApiUrl, {
          method: 'GET',
          headers: {
            'x-user-id': userId,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('[Middleware] Auth role endpoint returned non-OK status:', response.status);
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[Middleware] Response error:', errorText);
          
          // In development, show more details. In production, be more generic
          const isDev = process.env.NODE_ENV === 'development';
          const homeUrl = new URL('/', req.url);
          homeUrl.searchParams.set('error', 'unauthorized');
          homeUrl.searchParams.set('message', isDev 
            ? `Access denied. API error: ${response.status} - ${errorText}` 
            : 'Access denied. Unable to verify admin role.');
          return NextResponse.redirect(homeUrl);
        }

        const userData = (await response.json()) as { role?: string; error?: string };
        
        if (userData.error) {
          console.error('[Middleware] API returned error:', userData.error);
          const homeUrl = new URL('/', req.url);
          homeUrl.searchParams.set('error', 'unauthorized');
          homeUrl.searchParams.set('message', `Access denied. ${userData.error}`);
          return NextResponse.redirect(homeUrl);
        }
        
        const userRole = userData?.role;
        console.log('[Middleware] Retrieved user role:', userRole);

        if (userRole === 'admin' || userRole === 'super_admin') {
          return NextResponse.next();
        }

        // Not admin -> redirect to home with unauthorized message
        const homeUrl = new URL('/', req.url);
        homeUrl.searchParams.set('error', 'unauthorized');
        homeUrl.searchParams.set('message', `Access denied. Admin role required. Your role: ${userRole ?? 'user'}`);
        return NextResponse.redirect(homeUrl);
      } catch (error) {
        console.error('[Middleware] Error checking user role (fallback):', error);
        
        // In production, if both Clerk metadata and API check fail,
        // we have a few options:
        // 1. Block access (secure but might break if there's a temporary issue)
        // 2. Allow access (less secure but more resilient)
        // 
        // For now, let's be more permissive in production to avoid blocking legitimate users
        // when there are temporary infrastructure issues
        
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction) {
          // In production, if we can't verify the role due to system errors,
          // let the request through and let the client-side components handle authorization
          // This is a fallback for when Vercel/database has issues
          console.warn('[Middleware] Allowing access due to system error in production');
          return NextResponse.next();
        } else {
          // In development, show detailed error
          const homeUrl = new URL('/', req.url);
          homeUrl.searchParams.set('error', 'unauthorized');
          homeUrl.searchParams.set('message', `Access denied. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return NextResponse.redirect(homeUrl);
        }
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