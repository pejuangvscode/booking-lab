import { type AppType } from "next/app";
import { Geist } from "next/font/google";
import { useEffect } from "react";
import { api } from "~/utils/api";
import {
  ClerkProvider,
  useAuth
} from '@clerk/nextjs'

import { Navbar } from "~/components/navbar";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

// Create a wrapper component to use Clerk hooks
const AppContent = ({ Component, pageProps }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const syncUser = api.user.syncUser.useMutation();
  
  // Only attempt to sync user when auth is loaded and user is signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log("User is signed in, syncing with database");
      syncUser.mutate();
    }
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Component {...pageProps} />
      </main>
    </div>
  );
};

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className={geist.className}>
      <ClerkProvider {...pageProps}>
        <AppContent Component={Component} pageProps={pageProps} />
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);