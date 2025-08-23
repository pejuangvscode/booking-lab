import { ChevronDown, ChevronUp, Loader2, Search, Monitor, Users, MapPin, Calendar, BookOpen, Zap } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { useRef } from "react";

type Lab = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image?: string | null;
};

type SortField = "name" | "facilityId" | "type" | "capacity";

export default function LabSearch() {
  const router = useRouter();
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
  } = api.lab.getAll.useQuery();

  const {
    data: roomTypes = [],
    isLoading: isTypesLoading,
  } = api.lab.getRoomTypes.useQuery();

  // Function to get appropriate icon for lab type
  const getLabIcon = (type: string) => {
    return <Monitor className="h-8 w-8 text-orange-400" />;
  };

  const filteredData = labData.filter((lab: Lab) => {
    return (
      (lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lab.facilityId.toString().toLowerCase().includes(searchTerm.toLowerCase())) &&
      (roomTypeFilter === "all" || lab.type === roomTypeFilter)
    );
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

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 30) return "bg-green-100 text-green-700 border-green-200";
    if (capacity >= 20) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const isLoading = isLabsLoading || isTypesLoading;
  
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Head>
        <title>Lab Search - BookLab</title>
        <meta name="description" content="Search and book available laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Background Effects */}
      {/* <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div> */}
      
      <div className="container mx-auto px-4 py-6 sm:py-8 mt-16 sm:mt-20 relative z-10">
        {/* Header */}
        <div className="text-left mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Laboratory List
          </h1>
          <p className="text-left text-lg sm:text-xl text-gray-600 mx-auto">
            Find and book available laboratories
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search laboratories by name or ID..."
              className="pl-12 pr-4 py-4 w-full text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 text-base sm:text-lg shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center p-12 sm:p-16">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-orange-500 mx-auto mb-4" />
              <span className="text-lg text-gray-700 block text-center">Loading laboratories...</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {labsError && (
          <div className="flex justify-center items-center p-12 sm:p-16">
            <div className="bg-red-50 rounded-2xl p-8 border border-red-200 text-center shadow-lg">
              <p className="text-lg text-red-700 mb-4">Failed to load laboratories. Please try again later.</p>
              <Button 
                variant="outline" 
                className="bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Labs Grid */}
        {!isLoading && !labsError && (
          <div className="space-y-6">
            {currentItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-orange-50 rounded-2xl p-8 border border-orange-200 max-w-md mx-auto shadow-lg">
                  <Search className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentItems.map((lab, index) => (
                  <div
                    key={lab.id}
                    className="group relative bg-white rounded-2xl border border-gray-200 hover:border-orange-300 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-sm cursor-pointer"
                    onClick={() => setOpenLabId(openLabId === lab.id ? null : lab.id)}
                  >
                    <div className="flex items-center p-6 sm:p-8">

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
                              className="bg-gradient-to-r from-orange-400 hover:cursor-pointer to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 sm:px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0"
                              onClick={() => router.push(`/admin/booking?labId=${lab.id}`)}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-500 bg-gray-100 border-t pr-4 pl-4 border-gray-200 ${
                        openLabId === lab.id ? "max-h-[500px] py-6 opacity-100" : "max-h-0 py-0 opacity-0"
                      } flex justify-center items-center`}
                    >
                      {lab.image && (
                        <img
                          src={lab.image}
                          alt={`Room ${lab.name}`}
                          className="w-full rounded-xl max-w-xl shadow-lg object-cover"
                          style={{ transition: "transform 0.5s" }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/placeholder-lab.jpg";
                          }}
                        />
                      )}
                    </div>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 sm:mt-12">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      className="text-gray-700 hover:bg-gray-100"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            className={`w-10 h-10 ${
                              currentPage === pageNum
                                ? "bg-orange-500 text-white"
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
                      className="text-gray-700 hover:bg-gray-100"
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