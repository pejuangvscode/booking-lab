import { type AppType } from "next/app";

import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/700.css";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import {
  ClerkProvider,
  useAuth,
  useUser
} from '@clerk/nextjs'
import { useRouter } from "next/router";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

import { Navbar } from "~/components/navbar";

import "~/styles/globals.css";

import type { AppProps } from "next/app";

const AppContent = ({ Component, pageProps, router }: AppProps) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const nextRouter = useRouter();
  
  const syncUser = api.user.syncUser.useQuery(
    undefined,
    {
      enabled: isLoaded && isSignedIn && !!user,
      retry: (failureCount, error) => {
        if (error.data?.code === 'UNAUTHORIZED') {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  );

  // ...existing code...

  useEffect(() => {
    NProgress.configure({ 
      showSpinner: false,
      easing: 'ease',
      speed: 300,
      minimum: 0.1
    });

    const handleRouteStart = () => NProgress.start();
    const handleRouteDone = () => NProgress.done();

    nextRouter.events.on("routeChangeStart", handleRouteStart);
    nextRouter.events.on("routeChangeComplete", handleRouteDone);
    nextRouter.events.on("routeChangeError", handleRouteDone);

    return () => {
      nextRouter.events.off("routeChangeStart", handleRouteStart);
      nextRouter.events.off("routeChangeComplete", handleRouteDone);
      nextRouter.events.off("routeChangeError", handleRouteDone);
    };
  }, [nextRouter]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Component {...pageProps} router={router} />
      </main>
    </div>
  );
};

const MyApp: AppType = ({ Component, pageProps, router }) => {
  return (
    <div className="font-sans">
      <ClerkProvider 
        {...pageProps}
        afterSignInUrl="/auth/redirect"
        afterSignUpUrl="/auth/redirect"
      >
        <AppContent Component={Component} pageProps={pageProps} router={router} />
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);