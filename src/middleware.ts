import { clerkMiddleware, createRouteMatcher, getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/bookings(.*)',
  '/admin(.*)',
  '/lab-search(.*)'
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
  const cookies = req.headers.get('cookie') || '';
  return cookies.includes('__clerk_db_jwt') || 
         cookies.includes('__session') || 
         cookies.includes('__clerk');
}

export default clerkMiddleware(async (auth, req) => {  
  const url = req.nextUrl.clone();

  if (req.nextUrl.pathname.startsWith('/_next') || req.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf|eot|json|txt|xml|map)$/)) {
    return NextResponse.next();
  }

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (isTRPCRoute(req)) {
    return NextResponse.next();
  }

  try {
    const { userId, sessionClaims, sessionId } = await auth();
    if (isAdminRoute(req)) {
      
      if (userId && sessionClaims) {
        const userRole = (sessionClaims?.metadata as Record<string, unknown>)?.role as string | undefined ?? 
                        (sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string | undefined;
                
        if (userRole && userRole !== 'admin') {
          const homeUrl = new URL('/', req.url);
          homeUrl.searchParams.set('error', 'unauthorized');
          homeUrl.searchParams.set('message', `Admin access requires admin role. Your role: ${userRole}`);
          return NextResponse.redirect(homeUrl);
        }
        
        return NextResponse.next();
      }
      
      if (hasAuthCookies(req)) {
        return NextResponse.next();
      }
      
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
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