// filepath: d:\Kuliah UPH\Project Kuliah\SMT 4\booking-web\src\pages\Lab-Search\index.tsx
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";

type Lab = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
};

type SortField = "name" | "facilityId" | "type" | "capacity";

export default function LabSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: labData = [],
    isLoading: isLabsLoading,
    error: labsError,
  } = api.lab.getAll.useQuery();

  const {
    data: roomTypes = [],
    isLoading: isTypesLoading,
  } = api.lab.getRoomTypes.useQuery();

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 30) return "bg-green-100 text-green-800";
    if (capacity >= 1) return "bg-blue-100 text-blue-800";
    return "bg-amber-100 text-amber-800";
  };

  const isLoading = isLabsLoading || isTypesLoading;
  
  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Lab Search</title>
        <meta name="description" content="Search and book available laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-3xl font-bold text-white">Laboratory List</h2>
          <p className="text-blue-100 mt-2">Find and book available laboratories</p>
        </div>
        
        {/* Search and Filter Section */}
        <div className="p-6 bg-white border-b">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by name or ID..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600 mr-2" />
            <span>Loading laboratories...</span>
          </div>
        )}
        
        {/* Error State */}
        {labsError && (
          <div className="p-12 text-center text-red-500">
            <p>Failed to load laboratories. Please try again later.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        )}
        
        {/* Data Loaded State */}
        {!isLoading && !labsError && (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Lab Name
                        {sortField === "name" && (
                          sortDirection === "asc" ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("facilityId")}
                    >
                      <div className="flex items-center">
                        Lab ID
                        {sortField === "facilityId" && (
                          sortDirection === "asc" ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        {sortField === "type" && (
                          sortDirection === "asc" ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("capacity")}
                    >
                      <div className="flex items-center">
                        Capacity
                        {sortField === "capacity" && (
                          sortDirection === "asc" ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No laboratories found matching your search criteria
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((lab) => (
                      <tr key={lab.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer font-bold"
                            onClick={() => router.push(`/booking?labId=${lab.id}`)}
                          >
                            Book
                          </Button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{lab.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono">{lab.facilityId}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{lab.department}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-0">
                            {lab.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getCapacityColor(lab.capacity)}>
                            {lab.capacity} seats
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination - Only show if we have data more than one page
            {sortedData.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, sortedData.length)}
                      </span>{" "}
                      of <span className="font-medium">{sortedData.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <Button 
                        variant="outline"
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <Button
                          key={i}
                          variant={currentPage === i + 1 ? "default" : "outline"}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )} */}
          </>
        )}
      </div>
    </div>
  );
}