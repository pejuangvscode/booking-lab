import { useEffect } from 'react';
import { useAdminCheck } from '~/hooks/useAdminCheck';

interface AdminProtectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminProtection({ children, fallback }: AdminProtectionProps) {
  const { isAdmin, isLoading, redirectToHome, clerkRole, dbRole } = useAdminCheck();

  useEffect(() => {
    // Only redirect if we're sure the user is not an admin
    if (!isLoading && isAdmin === false) {
      redirectToHome(`Access denied. You need admin privileges to access this page. Clerk role: ${clerkRole || 'none'}, DB role: ${dbRole || 'none'}`);
    }
  }, [isAdmin, isLoading, redirectToHome, clerkRole, dbRole]);

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Verifying admin access...</p>
          </div>
        </div>
      )
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === true) {
    return <>{children}</>;
  }

  // Default loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}