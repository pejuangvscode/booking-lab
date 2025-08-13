import Link from "next/link";
import { useRouter } from "next/router";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import Image from "next/image";

export function Navbar() {
  const router = useRouter();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const { data: dbUser } = api.user.getCurrentUser.useQuery(
    undefined,
    {
      enabled: !!user,
      retry: 1,
    }
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 10;
      
      setPrevScrollPos(currentScrollPos);
      setVisible(isVisible);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollPos, isMounted]);

  const isAdmin = () => {
    const clerkRole = user?.publicMetadata?.role;
    const dbRole = dbUser?.role;
    return clerkRole === 'admin' || dbRole === 'admin';
  };

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  const getLinkClasses = (path: string) => {
    const baseClasses = "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200";
    
    if (isActive(path)) {
      return `${baseClasses} border-orange-500 text-orange-600 font-semibold`;
    }
    
    return `${baseClasses} border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700`;
  };

  const getMobileLinkClasses = (path: string) => {
    const baseClasses = "block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200";
    
    if (isActive(path)) {
      return `${baseClasses} border-orange-500 text-orange-600 bg-orange-50 font-semibold`;
    }
    
    return `${baseClasses} border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700`;
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-transform duration-300 ${
        isMounted && !visible ? '-translate-y-full' : 'transform-none'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div>
                <Image
                  src="/favicon.ico"
                  alt="BookLab Logo"
                  width={40}
                  height={40}
                  className="h-10 w-12 mr-2 border-r-2 pr-2 border-gray-300"
                />
              </div>
              <div className="flex-shrink-0 flex flex-col items-left">
                <span className={`text-lg sm:text-xl font-black leading-none transition-colors duration-200 text-orange-500`}>
                  Book
                </span>
                <span className={"text-lg sm:text-xl font-black leading-none transition-colors duration-200 text-orange-500"}>
                  Lab
                </span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {!isAdmin() ? (
                <>
                  <Link
                    href="/lab-search"
                    className={getLinkClasses('/lab-search')}
                  >
                    Lab Search
                  </Link>
                  <Link
                    href="/booking-calendar"
                    className={getLinkClasses('/booking-calendar')}
                  >
                    Booking Calendar
                  </Link>
                  <SignedIn>
                    <Link
                      href="/dashboard"
                      className={getLinkClasses('/dashboard')}
                    >
                      Dashboard
                    </Link>
                  </SignedIn>
                </>
                ) : (
                  <>
                    <Link
                      href="/admin/dashboard"
                      className={getLinkClasses('/admin/dashboard')}
                    >
                      Admin Dashboard
                    </Link>
                    <Link
                      href="/admin/booking-calendar"
                      className={getLinkClasses('/admin/booking-calendar')}
                    >
                      Booking Calendar
                    </Link>
                  </>
                )}
            </div>
          </div>
          
          {/* User Actions */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="hover:cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              {/* Show role badge for admins */}
              {isAdmin() && (
                <div className="mr-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Admin
                </div>
              )}
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-10 h-10",
                  },
                }}
              />
            </SignedIn>
          </div>
          
          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? "block" : "hidden"} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {!isAdmin() && (
            <>
              <Link
                onClick={() => setIsMenuOpen(false)}
                href="/lab-search"
                className={getMobileLinkClasses('/lab-search')}
              >
                Lab Search
              </Link>
              <Link
                onClick={() => setIsMenuOpen(false)}
                href="/booking-calendar"
                className={getMobileLinkClasses('/booking-calendar')}
              >
                Booking Calendar
              </Link>
              <SignedIn>
                <Link
                  onClick={() => setIsMenuOpen(false)}
                  href="/dashboard"
                  className={getMobileLinkClasses('/dashboard')}
                >
                  Dashboard
                </Link>
              </SignedIn>
            </>
          )}
        </div>
        
        {/* Mobile user section */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center space-x-3">
                {/* Show role badge for admins in mobile */}
                {isAdmin() && (
                  <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    Admin
                  </div>
                )}
                <div className="flex-shrink-0">
                  <UserButton />
                </div>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}