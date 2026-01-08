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
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

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
      const atTop = currentScrollPos < 50 && router.pathname === "/";

      setPrevScrollPos(currentScrollPos);
      setVisible(isVisible);
      setIsAtTop(currentScrollPos < 50 && router.pathname === '/');
    };

    const currentScrollPos = window.scrollY;
    setIsAtTop(currentScrollPos < 50 && router.pathname === '/');

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollPos, isMounted]);

  useEffect(() => {
    // Immediately update isAtTop when route changes
    const currentScrollPos = window.scrollY;
    setIsAtTop(currentScrollPos < 50 && router.pathname === '/');
  }, [router.pathname]); // This will run whenever the route changes

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsAdminDropdownOpen(false);
      }
    };

    if (isAdminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminDropdownOpen]);


  const isAdmin = () => {
    const clerkRole = user?.publicMetadata?.role;
    const dbRole = dbUser?.role;
    return clerkRole === 'admin' || dbRole === 'admin' || dbRole === 'super_admin' || clerkRole === 'super_admin';
  };

  const isSuperAdmin = () => {
    const clerkRole = user?.publicMetadata?.role;
    const dbRole = dbUser?.role;
    return dbRole === 'super_admin' || clerkRole === 'super_admin';
  };

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  const getLinkClasses = (path: string) => {
    const baseClasses = "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300";
    
    if (isActive(path)) {
      return `${baseClasses} border-orange-500 text-orange-600 font-semibold`;
    }
    
    return `${baseClasses} border-transparent ${isAtTop && router.pathname === '/' ? 'text-gray-700 hover:text-orange-600' : 'text-gray-600 hover:text-orange-600'} hover:border-orange-300`;
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isMounted && !visible ? '-translate-y-full' : 'transform-none'
      } ${isAtTop && router.pathname === '/' 
          ? 'bg-white/5 backdrop-blur-md border-b border-white/10' 
          : 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
      } ${isMenuOpen && 'bg-white/95 backdrop-blur-md shadow-lg'}`}
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
                  className="h-10 w-12 mr-2 border-r-2 pr-2 transition-colors duration-300 border-gray-300"
                />
              </div>
              <div className="flex-shrink-0 flex flex-col items-left">
                <span className={`text-lg sm:text-xl font-black leading-none transition-colors duration-300 ${
                  isMenuOpen ? 'text-orange-600' :
                  isAtTop && router.pathname === '/' ? 'text-orange-500 drop-shadow-lg' : 'text-orange-500'
                }`}>
                  Book
                </span>
                <span className={`text-lg sm:text-xl font-black leading-none transition-colors duration-300 ${
                  isMenuOpen ? 'text-orange-600' : isAtTop && router.pathname === '/' ? 'text-orange-500 drop-shadow-lg' : 'text-orange-500'
                }`}>
                  Lab
                </span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <SignedOut>
                <Link
                  href="/book-room"
                  className={getLinkClasses('/book-room')}
                >
                  Book Room
                </Link>
                <Link
                  href="/booking-calendar"
                  className={getLinkClasses('/booking-calendar')}
                >
                  Booking Calendar
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/book-room"
                  className={getLinkClasses('/book-room')}
                >
                  Book Room
                </Link>
                <Link
                  href="/booking-calendar"
                  className={getLinkClasses('/booking-calendar')}
                >
                  Booking Calendar
                </Link>
                <Link
                  href="/dashboard"
                  className={getLinkClasses('/dashboard')}
                >
                  Dashboard
                </Link>
                {isAdmin() && (
                  <div className="relative">
                    <button
                      onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium hover:cursor-pointer transition-colors duration-300 ${
                        router.pathname.startsWith('/admin')
                          ? 'border-orange-500 text-orange-600 font-semibold'
                          : 'border-transparent text-gray-700 hover:text-orange-600 hover:border-orange-300'
                      }`}
                    >
                      Admin Menu
                      <svg
                        className={`ml-1 h-4 w-4 transition-transform duration-200 ${isAdminDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isAdminDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white/95 backdrop-blur-md border border-gray-200 z-50">
                        <div className="py-1" role="menu">
                          <Link
                            href="/admin/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => setIsAdminDropdownOpen(false)}
                          >
                            Admin Dashboard
                          </Link>
                          <Link
                            href="/admin/lab-search"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => setIsAdminDropdownOpen(false)}
                          >
                            Book as Admin
                          </Link>
                          <Link
                            href="/admin/manage-booking"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => setIsAdminDropdownOpen(false)}
                          >
                            Manage Booking
                          </Link>
                          {isSuperAdmin() && (
                            <Link
                              href="/admin/manage-admin"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                              onClick={() => setIsAdminDropdownOpen(false)}
                            >
                              Manage Admin
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SignedIn>
            </div>
          </div>
          
          {/* User Actions */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <SignedOut>
              <SignInButton mode="modal">
                <button className={`hover:cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isAtTop && router.pathname === '/'
                    ? 'text-gray-400 bg-transparent outline-gray-400 outline-2 hover:bg-orange-500 hover:outline-orange-500 hover:text-white focus:ring-gray-500' 
                    : 'text-white bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                }`}>
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-10 h-10 rounded-full border border-gray-200",
                  },
                }}
              />
            </SignedIn>
          </div>
          
          {/* Mobile menu button */}
          <div className={`-mr-2 flex items-center sm:hidden`}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 transition-colors duration-300"
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
      <div className={`${isMenuOpen ? "block" : "hidden"} sm:hidden bg-white border-t border-gray-200`}>
        <div className="pt-2 pb-3 space-y-1">
          <SignedOut>
            <Link
              onClick={() => setIsMenuOpen(false)}
              href="/book-room"
              className={getMobileLinkClasses('/book-room')}
            >
              Book Room
            </Link>
            <Link
              onClick={() => setIsMenuOpen(false)}
              href="/booking-calendar"
              className={getMobileLinkClasses('/booking-calendar')}
            >
              Booking Calendar
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              onClick={() => setIsMenuOpen(false)}
              href="/book-room"
              className={getMobileLinkClasses('/book-room')}
            >
              Book Room
            </Link>
            <Link
              onClick={() => setIsMenuOpen(false)}
              href="/booking-calendar"
              className={getMobileLinkClasses('/booking-calendar')}
            >
              Booking Calendar
            </Link>
            <Link
              onClick={() => setIsMenuOpen(false)}
              href="/dashboard"
              className={getMobileLinkClasses('/dashboard')}
            >
              Dashboard
            </Link>
            {isAdmin() && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAdminDropdownOpen(!isAdminDropdownOpen);
                  }}
                  className="w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 flex items-center justify-between cursor-pointer"
                >
                  <span>Admin Menu</span>
                  <svg
                    className={`h-5 w-5 transition-transform duration-200 ${isAdminDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isAdminDropdownOpen && (
                  <div className="bg-gray-50 border-l-4 border-orange-200">
                    <button
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMenuOpen(false); 
                        setIsAdminDropdownOpen(false);
                        void router.push('/admin/dashboard');
                      }}
                      className="w-full text-left block pl-8 pr-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                    >
                      Admin Dashboard
                    </button>
                    <button
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMenuOpen(false); 
                        setIsAdminDropdownOpen(false);
                        void router.push('/admin/lab-search');
                      }}
                      className="w-full text-left block pl-8 pr-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                    >
                      Book as Admin
                    </button>
                    <button
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMenuOpen(false); 
                        setIsAdminDropdownOpen(false);
                        void router.push('/admin/manage-booking');
                      }}
                      className="w-full text-left block pl-8 pr-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                    >
                      Manage Booking
                    </button>
                    {isSuperAdmin() && (
                      <button
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation();
                          setIsMenuOpen(false); 
                          setIsAdminDropdownOpen(false);
                          void router.push('/admin/manage-admin');
                        }}
                        className="w-full text-left block pl-8 pr-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                      >
                        Manage Admin
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </SignedIn>
        </div>
        
        {/* Mobile user section */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center space-x-3">
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