import { clerkMiddleware, createRouteMatcher, getAuth } from '@clerk/nextjs/server';
import { db } from './server/db';
import { NextRequest, NextResponse } from 'next/server';

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
      // Ambil userId dari Clerk
      const { userId } = await auth();
      if (!userId) {
        // Belum login
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }
      
      // Query database langsung untuk mendapatkan role user
      let userRole: string | undefined;
      try {
        const user = await db.users.findUnique({
          where: { id: userId },
          select: { role: true }
        });
        userRole = user?.role;
      } catch (err) {
        console.error('Database query error in middleware:', err);
        // Jika error database, biarkan akses untuk menghindari redirect loop
        return NextResponse.next();
      }
      
      if (!userRole) {
        // Tidak ada role di database, buat user baru dengan role default
        try {
          await db.users.upsert({
            where: { id: userId },
            update: {},
            create: {
              id: userId,
              role: 'user'
            }
          });
          userRole = 'user';
        } catch (err) {
          console.error('Error creating user in middleware:', err);
          // Jika gagal membuat user, redirect ke sign-in
          const signInUrl = new URL('/sign-in', req.url);
          signInUrl.searchParams.set('redirect_url', req.url);
          return NextResponse.redirect(signInUrl);
        }
      }
      
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        // Role bukan admin atau super_admin, redirect ke home
        const homeUrl = new URL('/', req.url);
        homeUrl.searchParams.set('error', 'unauthorized');
        homeUrl.searchParams.set('message', `Admin access requires admin or super admin role. Your role: ${userRole}`);
        return NextResponse.redirect(homeUrl);
      }
      // Role admin atau super_admin, lanjut render
      return NextResponse.next();
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