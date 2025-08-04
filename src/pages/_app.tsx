import { type AppType } from "next/app";
import { Geist } from "next/font/google";
import { useEffect } from "react";
import { api } from "~/utils/api";
import {
  ClerkProvider,
  useAuth
} from '@clerk/nextjs'
import { useRouter } from "next/router";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

import { Navbar } from "~/components/navbar";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

import type { AppProps } from "next/app";

const AppContent = ({ Component, pageProps, router }: AppProps) => {
  const { isSignedIn, isLoaded } = useAuth();
  const syncUser = api.user.syncUser.useMutation();
  const nextRouter = useRouter();
  
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      syncUser.mutate();
    }
  }, [isLoaded, isSignedIn]);

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
    <div className={geist.className}>
      <ClerkProvider {...pageProps}>
        <AppContent Component={Component} pageProps={pageProps} router={router} />
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);