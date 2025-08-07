import { useState } from 'react';
import { useRouter } from 'next/router';
import { SignIn } from '@clerk/nextjs';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const { redirectUrl } = router.query;

  return (
    <>
      <Head>
        <title>Sign In - BookLab</title>
        <meta name="description" content="Sign in to your BookLab account" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="flex items-center">
              <Image
                src="/favicon.ico"
                alt="BookLab Logo"
                width={40}
                height={40}
                className="h-10 w-12 mr-2"
              />
              <div className="flex-shrink-0 flex flex-col items-left">
                <span className="text-lg sm:text-xl font-black leading-none text-orange-500">
                  Book
                </span>
                <span className="text-lg sm:text-xl font-black leading-none text-orange-500">
                  Lab
                </span>
              </div>
            </div>
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex justify-center">
              <SignIn 
                path="/sign-in" 
                routing="path" 
                signUpUrl="/sign-up" 
                redirectUrl={redirectUrl as string || '/dashboard'} 
              />
            </div>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Faculty of Information Technology
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center">
                <div className="text-sm text-center text-gray-500">
                  <p className="mb-1">Universitas Pelita Harapan</p>
                  <p>© 2025 BookLab - All rights reserved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}