import { type AppType } from "next/app";
import { Geist } from "next/font/google";

import { api } from "~/utils/api";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs'

import { Navbar } from "~/components/navbar";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className={geist.className}>
      <ClerkProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Component {...pageProps} />
          </main>
        </div>
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);