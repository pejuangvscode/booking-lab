import { ChevronDown, ChevronUp, Loader2, Search, Monitor, Users, MapPin, Calendar, BookOpen, Zap } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { useRef } from "react";
import { useUser } from "@clerk/nextjs";

type Lab = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image?: string | null;
  picIds?: string | string[] | null;
};

type SortField = "name" | "facilityId" | "type" | "capacity";

export default function LabSearch() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [openLabId, setOpenLabId] = useState<string | null>(null);

  const {
    data: labData = [],
    isLoading: isLabsLoading,
    error: labsError,
  } = api.admin.getAccessibleLabs.useQuery(undefined, {
    enabled: isLoaded && isSignedIn && !!user?.id,
  });

  const {
    data: currentUser,
    isLoading: isUserLoading,
  } = api.user.getCurrentUser.useQuery(undefined, {
    enabled: isLoaded && isSignedIn && !!user?.id,
  });

  const isUserPICForLab = (lab: Lab) => {
    if (!user?.id || !lab.picIds) return false;
    
    try {
      // Parse picIds from JSON if it's a string
      const picIdsArray = typeof lab.picIds === 'string' 
        ? (JSON.parse(lab.picIds) as string[])
        : Array.isArray(lab.picIds) 
          ? lab.picIds 
          : [];
      
      return picIdsArray.includes(user.id);
    } catch {
      return false;
    }
  };

  // Check if user is super_admin
  const isUserSuperAdmin = () => {
    if (!user) return false;
    
    // First check Clerk metadata
    const clerkRole = user.publicMetadata?.role as string;
    if (clerkRole === 'super_admin') {
      return true;
    }
    
    // Fallback to database role if available
    if (currentUser && currentUser.role === 'super_admin') {
      return true;
    }
    return false;
  };

  // Function to get appropriate icon for lab type
  const getLabIcon = (type: string) => {
    return <Monitor className="h-8 w-8 text-orange-400" />;
  };

  const filteredData = labData.filter((lab: Lab) => {
    // First apply search filter
    const matchesSearch = lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.facilityId.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply room type filter
    const matchesType = roomTypeFilter === "all" || lab.type === roomTypeFilter;
    
    // Check if user is super admin
    const isSuperAdmin = isUserSuperAdmin();
    
    // If super admin, show all labs that match search and type
    if (isSuperAdmin) {
      return matchesSearch && matchesType;
    }
    
    // If not super admin, only show labs where user is PIC
    const isPIC = isUserPICForLab(lab);
    
    return matchesSearch && matchesType && isPIC;
  });

  const sortedData = [...filteredData].sort((a: Lab, b: Lab) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Show loading state while Clerk is initializing
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 30) return "border border-gray-200 bg-white text-gray-600";
    if (capacity >= 20) return "border border-gray-200 bg-white text-gray-600";
    if (capacity >= 10) return "border border-gray-200 bg-white text-gray-600";
    return "border border-gray-200 bg-white text-gray-600";
  };

  // Handle booking based on user's role and PIC status
  const handleBooking = (lab: Lab) => {
    const isSuperAdmin = isUserSuperAdmin();
    
    if (isSuperAdmin) {
      // Super admin - always go to admin booking regardless of PIC status
      void router.push(`/admin/booking?labId=${lab.id}`);
    } else if (isUserPICForLab(lab)) {
      // User is PIC for this lab - go to admin booking
      void router.push(`/admin/booking?labId=${lab.id}`);
    } else {
      // User is not PIC for this lab - go to regular user booking
      void router.push(`/booking?labId=${lab.id}`);
    }
  };

  const isLoading = isLabsLoading || isUserLoading;
  
  return (
    <div className="min-h-screen bg-neutral-50">
      <Head>
        <title>Lab Search - BookLab</title>
        <meta name="description" content="Search and book available laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto max-w-3xl px-6 pb-20 pt-24 sm:pt-28">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">Find a laboratory</h1>
          <p className="mt-2 text-base text-gray-500">Find the laboratory you want to book for your activities.</p>
        </div>

        {/* Search Section */}
        <div className="relative mb-8">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search laboratories by name or ID"
            className="h-11 rounded-xl border-gray-200 bg-white pl-10 text-base shadow-none focus-visible:border-orange-400 focus-visible:ring-orange-400/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Toggle Dashboard Button
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="bg-white border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 px-6 py-2 rounded-lg shadow-sm"
              onClick={() => {
                if (isUserSuperAdmin()) {
                  // Super admin - go to admin dashboard
                  void router.push('/admin/dashboard');
                } else {
                  // Regular user - go to user dashboard
                  void router.push('/dashboard');
                }
              }}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {isUserSuperAdmin() ? 'Admin Dashboard' : 'User Dashboard'}
            </Button>
          </div>
        </div> */}
        
        {/* Loading State - Skeleton */}
        {isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse"
              >
                <div className="flex items-center">
                  <div className="flex-grow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                      <div className="flex-grow space-y-3">
                        {/* Title skeleton */}
                        <div className="h-7 bg-gray-200 rounded-lg w-3/4"></div>
                        {/* Subtitle skeleton */}
                        <div className="h-5 bg-gray-200 rounded-lg w-1/2"></div>
                        {/* Badges skeleton */}
                        <div className="flex gap-3 mt-4">
                          <div className="h-7 bg-gray-200 rounded-full w-24"></div>
                          <div className="h-7 bg-gray-200 rounded-full w-28"></div>
                        </div>
                      </div>
                      {/* Button skeleton */}
                      <div className="mt-4 sm:mt-0 sm:ml-6">
                        <div className="h-11 bg-gray-200 rounded-xl w-32"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Error State */}
        {labsError && (
          <div className="flex justify-center items-center p-12 sm:p-16">
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md mx-auto">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                <Zap className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Oops! Something went wrong</h3>
              <p className="text-base text-red-700 mb-6">Failed to load laboratories. Please try again later.</p>
              <Button 
                className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 rounded-lg"
                onClick={() => window.location.reload()}
              >
                <Zap className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Labs Grid */}
        {!isLoading && !labsError && (
          <div className="space-y-6">
            {currentItems.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center max-w-md mx-auto">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {isUserSuperAdmin() ? "No Results Found" : "No Labs Assigned"}
                  </h3>
                  <p className="text-base text-gray-600">
                    {isUserSuperAdmin() 
                      ? "Try adjusting your search criteria" 
                      : "You are not assigned as PIC for any labs yet. Contact the super admin to get lab assignments."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {currentItems.map((lab, index) => (
                  <div
                    key={lab.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300 cursor-pointer"
                    onClick={() => setOpenLabId(openLabId === lab.id ? null : lab.id)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center p-5 relative z-10">

                      {/* Content */}
                      <div className="flex-grow">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                          <div className="flex-grow">
                            <h3 className="text-base font-medium text-gray-900">
                              {lab.name}
                            </h3>
                            <p className="mt-0.5 mb-3 text-sm text-gray-500">
                              {lab.department} • Lab ID: {lab.facilityId}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                              <Badge className="border border-gray-200 bg-white text-gray-600 text-xs px-2 py-0.5">
                                <MapPin className="h-3 w-3 mr-1" />
                                {lab.type}
                              </Badge>
                              <Badge className={`${getCapacityColor(lab.capacity)} text-xs px-2 py-0.5`}>
                                <Users className="h-3 w-3 mr-1" />
                                {lab.capacity} seats
                              </Badge>
                            </div>
                          </div>

                          {/* Book Button */}
                          <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 items-center">
                            <Button
                              className="bg-orange-600 text-white hover:bg-orange-700 hover:cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBooking(lab);
                              }}
                            >
                              <span className="flex items-center relative z-10">
                                <Calendar className="h-4 w-4 mr-2" />
                                Book Now
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-500 border-t border-gray-100 bg-white px-5 ${
                        openLabId === lab.id ? "max-h-[600px] py-6 sm:py-8 opacity-100" : "max-h-0 py-0 opacity-0"
                      } flex justify-center items-center`}
                    >
                      {lab.image && (
                        <div className="relative group/img">
                          <img
                            src={lab.image}
                            alt={`Room ${lab.name}`}
                            className="w-full rounded-lg max-w-2xl object-cover border border-gray-100"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/placeholder-lab.jpg";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 sm:mt-12">
                <div className="rounded-xl border border-gray-200 bg-white p-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:bg-gray-100 rounded-lg"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex space-x-1 sm:space-x-2">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            className={`w-10 h-10 rounded-xl font-medium transition-all duration-300 ${
                              currentPage === pageNum
                                ? "bg-gray-900 text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:bg-gray-100 rounded-lg"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}