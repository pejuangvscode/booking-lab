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
    if (capacity >= 30) return "bg-green-100 text-green-700 border-green-200";
    if (capacity >= 20) return "bg-blue-100 text-blue-700 border-blue-200";
    if (capacity >= 10) return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 relative overflow-hidden">
      <Head>
        <title>Lab Search - BookLab</title>
        <meta name="description" content="Search and book available laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Background Effects */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 py-6 sm:py-8 mt-16 sm:mt-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-fadeInUp">
          <div className="inline-block mb-4">
            <span className="text-orange-600 font-semibold text-xs sm:text-sm uppercase tracking-wider bg-orange-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">Browse Labs</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-3 sm:mb-4">
            Find Your Perfect <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Laboratory</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Find the laboratory you want to book for your activities
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Search laboratories by name or ID..."
              className="pl-12 sm:pl-14 pr-4 py-4 sm:py-5 w-full text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-400/20 focus:border-orange-400 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
                className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-6 sm:p-8 animate-pulse"
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
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-8 sm:p-10 border-2 border-red-200 text-center shadow-2xl max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
              <p className="text-base text-red-700 mb-6">Failed to load laboratories. Please try again later.</p>
              <Button 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 sm:p-10 border-2 border-orange-200 max-w-md mx-auto shadow-2xl">
                  <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
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
                    className="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-orange-400 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl shadow-lg cursor-pointer overflow-hidden"
                    onClick={() => setOpenLabId(openLabId === lab.id ? null : lab.id)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    
                    <div className="flex items-center p-6 sm:p-8 relative z-10">

                      {/* Content */}
                      <div className="flex-grow">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                          <div className="flex-grow">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                              {lab.name}
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base mb-4 leading-relaxed">
                              {lab.department} • Lab ID: {lab.facilityId}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs sm:text-sm px-3 py-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {lab.type}
                              </Badge>
                              <Badge className={`${getCapacityColor(lab.capacity)} text-xs sm:text-sm px-3 py-1`}>
                                <Users className="h-3 w-3 mr-1" />
                                {lab.capacity} seats
                              </Badge>
                            </div>
                          </div>

                          {/* Book Button */}
                          <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 items-center">
                            <Button
                              className="relative hover:cursor-pointer overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 border-0 group/btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBooking(lab);
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
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
                      className={`overflow-hidden transition-all duration-500 bg-gradient-to-br from-gray-50 to-gray-100 border-t-2 px-4 sm:px-6 border-gray-200 ${
                        openLabId === lab.id ? "max-h-[600px] py-6 sm:py-8 opacity-100" : "max-h-0 py-0 opacity-0"
                      } flex justify-center items-center`}
                    >
                      {lab.image && (
                        <div className="relative group/img">
                          <img
                            src={lab.image}
                            alt={`Room ${lab.name}`}
                            className="w-full rounded-2xl max-w-2xl shadow-2xl object-cover border-4 border-white group-hover/img:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/placeholder-lab.jpg";
                            }}
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500"></div>
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
                <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-gray-100 shadow-2xl">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:bg-orange-50 hover:text-orange-600 font-semibold transition-all duration-300 rounded-xl"
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
                            className={`w-10 h-10 rounded-xl font-semibold transition-all duration-300 ${
                              currentPage === pageNum
                                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110"
                                : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
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
                      className="text-gray-700 hover:bg-orange-50 hover:text-orange-600 font-semibold transition-all duration-300 rounded-xl"
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