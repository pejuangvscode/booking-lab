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
    const { userId } = await auth();
    
    if (isAdminRoute(req)) {
      if (!userId) {
        // Belum login
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }
      
      // Untuk admin route, buat API call ke server untuk cek role
      try {
        const response = await fetch(`${req.nextUrl.origin}/api/auth/role`, {
          method: 'GET',
          headers: {
            'x-user-id': userId,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json() as { role?: string };
        const userRole = userData?.role;

        if (!userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
          // Bukan admin, redirect ke home dengan pesan error
          const homeUrl = new URL('/', req.url);
          homeUrl.searchParams.set('error', 'unauthorized');
          homeUrl.searchParams.set('message', `Access denied. Admin role required. Your role: ${userRole ?? 'user'}`);
          return NextResponse.redirect(homeUrl);
        }
        
        return NextResponse.next();
      } catch (error) {
        console.error('Error checking user role in middleware:', error);
        // Jika error saat cek role, redirect ke sign-in
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        signInUrl.searchParams.set('error', 'auth_check_failed');
        return NextResponse.redirect(signInUrl);
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