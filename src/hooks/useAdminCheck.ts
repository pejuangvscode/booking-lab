import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '~/utils/api';

export function useAdminCheck() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user role from database
  const { data: dbUser, isLoading: dbLoading, error } = api.user.getCurrentUser.useQuery(
    undefined,
    {
      enabled: isLoaded && isSignedIn && !!user,
      retry: 1,
    }
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    // Check Clerk metadata first
    const clerkRole = user.publicMetadata?.role as string | undefined;
    if (clerkRole === 'admin' || clerkRole === 'super_admin') {
      setIsAdmin(true);
      setIsLoading(false);
      return;
    }

    // If database query is done
    if (!dbLoading) {
      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else if (dbUser) {
        const isAdminUser = dbUser.role === 'admin' || dbUser.role === 'super_admin';
        setIsAdmin(isAdminUser);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, user, dbUser, dbLoading, error]);

  const redirectToHome = (message?: string) => {
    const url = new URL('/', window.location.origin);
    if (message) {
      url.searchParams.set('error', 'unauthorized');
      url.searchParams.set('message', message);
    }
    void router.replace(url.toString());
  };

  return {
    isAdmin,
    isLoading,
    redirectToHome,
    clerkRole: user?.publicMetadata?.role as string | undefined,
    dbRole: dbUser?.role,
  };
}