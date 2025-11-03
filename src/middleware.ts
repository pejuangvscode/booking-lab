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
        
        const response = await fetch(roleApiUrl, {
          method: 'GET',
          headers: {
            'x-user-id': userId,
            'Content-Type': 'application/json',
          },
          // Add timeout for Vercel
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

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
        
        // In production/Vercel, database connection might fail
        // Instead of blocking completely, we could allow access if user at least has valid Clerk session
        // But for security, we'll still block and show error
        const isDev = process.env.NODE_ENV === 'development';
        const homeUrl = new URL('/', req.url);
        homeUrl.searchParams.set('error', 'unauthorized');
        homeUrl.searchParams.set('message', isDev 
          ? `Access denied. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          : 'Access denied. System error - please try again later.');
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