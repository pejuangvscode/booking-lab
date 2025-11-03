import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, useUser } from '@clerk/nextjs';
import { api } from '~/utils/api';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  

  const { data: dbUser, isLoading } = api.user.getCurrentUser.useQuery(
    undefined,
    {
      enabled: isLoaded && isSignedIn && !!user,
      retry: false,
    }
  );

  useEffect(() => {
    if (!isLoaded || isLoading) return;

    if (!isSignedIn || !user) {
      router.replace('/');
      return;
    }

    const clerkRole = user.publicMetadata?.role;
    if (clerkRole && clerkRole !== 'admin' && clerkRole !== 'super_admin') {
      void router.replace('/');
      return;
    }

    if (dbUser && dbUser.role !== 'admin' && dbUser.role !== 'super_admin') {
      void router.replace('/');
      return;
    }
  }, [isLoaded, isSignedIn, user, dbUser, router, isLoading]);

  if (!isLoaded || isLoading || !isSignedIn || !user || !dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}