import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import { api } from '~/utils/api';
import { Loader2 } from 'lucide-react';
import Head from 'next/head';

export default function AuthRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  
  const { data: dbUser } = api.user.getCurrentUser.useQuery(
    undefined,
    {
      enabled: isLoaded && isSignedIn && !!user,
      retry: 1,
    }
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      // If not loaded or not signed in, redirect to home
      void router.push('/');
      return;
    }

    if (!dbUser) {
      // Still loading user data
      return;
    }

    // Determine redirect URL based on user role
    const clerkRole = user.publicMetadata?.role;
    const dbRole = dbUser.role;
    
    const isAdmin = clerkRole === 'admin' || 
                    dbRole === 'admin' || 
                    clerkRole === 'super_admin' || 
                    dbRole === 'super_admin';

    // Get the intended redirect URL from query params if available
    const { redirect_url } = router.query;
    
    if (redirect_url && typeof redirect_url === 'string') {
      // If there's a specific redirect URL, use it (unless it conflicts with role)
      if (isAdmin && !redirect_url.startsWith('/admin')) {
        // Admin trying to access non-admin page, redirect to admin dashboard
        void router.push('/admin/dashboard');
      } else if (!isAdmin && redirect_url.startsWith('/admin')) {
        // Non-admin trying to access admin page, redirect to user dashboard
        void router.push('/dashboard');
      } else {
        // Safe to redirect to intended URL
        void router.push(redirect_url);
      }
    } else {
      // No specific redirect URL, use role-based default
      if (isAdmin) {
        void router.push('/admin/dashboard');
      } else {
        void router.push('/dashboard');
      }
    }
  }, [isLoaded, isSignedIn, user, dbUser, router]);

  // Show loading while determining redirect
  return (
    <>
      <Head>
        <title>Redirecting... - BookLab</title>
        <meta name="description" content="Redirecting to your dashboard" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirecting...
          </h2>
          <p className="text-gray-600">
            Taking you to your dashboard
          </p>
        </div>
      </div>
    </>
  );
}