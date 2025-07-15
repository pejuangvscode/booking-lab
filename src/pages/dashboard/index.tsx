import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Search, Info, XCircle, RefreshCw } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { api } from '~/utils/api';
import Head from 'next/head';

// Define booking type with optional structure to handle both room and lab properties
type Booking = {
  id: number;  // Change from number | string to number to match API
  createdAt: Date;
  userId: string;
  roomId: string;
  bookingDate: Date;  // Change from string to Date
  startTime: string;
  endTime: string;
  participants: number;
  eventName: string;
  eventType: string;
  phone: string;
  faculty: string;
  status: string;
  requesterName: string | null;
  requesterNIM: string | null;
  lab?: {
    name: string;
    facilityId: string;
  };
  room?: {
    name: string;
    facilityId: string;
  };
};

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  // Table state for current bookings
  const [currentEntriesCount, setCurrentEntriesCount] = useState(10);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Table state for completed bookings
  const [completedEntriesCount, setCompletedEntriesCount] = useState(10);
  const [completedSearchTerm, setCompletedSearchTerm] = useState("");
  const [completedPage, setCompletedPage] = useState(1);

  // Fetch current bookings using tRPC
  const {
    data: currentBookingsData,
    isLoading: isLoadingCurrentBookings,
    isError: isErrorCurrentBookings,
    refetch: refetchCurrentBookings
  } = api.booking.getCurrentUserBookings.useQuery(
    {
      limit: currentEntriesCount,
      page: currentPage,
      search: currentSearchTerm
    },
    {
      enabled: isSignedIn && isMounted,
      refetchOnWindowFocus: false
    }
  );

  // Fetch completed bookings using tRPC
  const {
    data: completedBookingsData,
    isLoading: isLoadingCompletedBookings,
    isError: isErrorCompletedBookings,
    refetch: refetchCompletedBookings
  } = api.booking.getCompletedUserBookings.useQuery(
    {
      limit: completedEntriesCount,
      page: completedPage,
      search: completedSearchTerm
    },
    {
      enabled: isSignedIn && isMounted,
      refetchOnWindowFocus: false
    }
  );

  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleCancelBooking = (bookingId: number) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      cancelBookingMutation.mutate({ id: String(bookingId) });
    }
  };

  const cancelBookingMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      // Refetch both queries to update the UI
      void refetchCurrentBookings();
      void refetchCompletedBookings();
    },
    onError: (error) => {
      alert(`Failed to cancel booking: ${error.message}`);
    }
  });

  // Format date function
  // Update the formatDate function to handle Date objects
const formatDate = (date: Date | string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  // Handle both Date objects and date strings
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', options);
};

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending':
        return "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-0";
      case 'accepted':
        return "bg-green-100 hover:bg-green-200 text-green-800 border-0";
      case 'rejected':
        return "bg-red-100 hover:bg-red-200 text-red-800 border-0";
      case 'cancelled':
        return "bg-gray-100 hover:bg-gray-200 text-gray-800 border-0";
      case 'completed':
        return "bg-blue-100 hover:bg-blue-200 text-blue-800 border-0";
      default:
        return "bg-blue-100 hover:bg-blue-200 text-blue-800 border-0";
    }
  };

  // Helper function to get location name safely
  const getLocationInfo = (booking: Booking) => {
    // Try lab first, then room if lab doesn't exist
    const locationObj = booking.lab || booking.room;
    
    if (!locationObj) {
      return { name: 'Unknown', facilityId: 'Unknown' };
    }
    
    return {
      name: locationObj.name || 'Unknown',
      facilityId: locationObj.facilityId || 'Unknown'
    };
  };

  // Only render content client-side to avoid hydration mismatch
  if (!isMounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Dashboard</title>
        <meta name="description" content="Manage your room bookings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Current Bookings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-3xl font-bold text-white">My Bookings</h2>
          <p className="text-blue-100 mt-2">Manage your current room bookings</p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span>Show</span>
              <select 
                className="border rounded px-2 py-1"
                value={currentEntriesCount}
                onChange={(e) => setCurrentEntriesCount(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="current-search" className="mr-2">Search:</label>
              <Input
                id="current-search"
                type="text"
                className="w-64"
                value={currentSearchTerm}
                onChange={(e) => setCurrentSearchTerm(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchCurrentBookings()}
                className="text-orange-600"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingCurrentBookings ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-600 mx-auto" />
                    </td>
                  </tr>
                ) : isErrorCurrentBookings ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-red-500">
                      Error loading bookings. Please try again.
                    </td>
                  </tr>
                ) : currentBookingsData && currentBookingsData.bookings.length > 0 ? (
                  currentBookingsData.bookings.map((booking, index) => {
                    const location = getLocationInfo(booking);
                    return (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(currentPage - 1) * currentEntriesCount + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(booking.bookingDate)} at {booking.startTime} - {booking.endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {location.name} ({location.facilityId})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadge(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.eventName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border-blue-200"
                              onClick={() => router.push(`/booking/${booking.id}/details`)}
                            >
                              <Info className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 border-red-200"
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancelBookingMutation.isPending} // Changed from isLoading to isPending
                            >
                              {cancelBookingMutation.isPending ? ( // Changed from isLoading to isPending
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              {currentBookingsData ? (
                `Showing ${currentBookingsData.total > 0 ? (currentPage - 1) * currentEntriesCount + 1 : 0} to ${Math.min(currentPage * currentEntriesCount, currentBookingsData.total)} of ${currentBookingsData.total} entries`
              ) : (
                "Showing 0 to 0 of 0 entries"
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              {currentBookingsData && Array.from({ length: Math.ceil(currentBookingsData.total / currentEntriesCount) }).map((_, i) => (
                <Button 
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  className={currentPage === i + 1 ? "bg-orange-600 hover:bg-orange-700" : ""}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline"
                disabled={!currentBookingsData || currentPage >= Math.ceil(currentBookingsData.total / currentEntriesCount)}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Bookings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800">
          <h2 className="text-3xl font-bold text-white">Completed Bookings</h2>
          <p className="text-blue-100 mt-2">View your past room bookings</p>
        </div>
        
        <div className="p-6">
          {/* Similar changes for the completed bookings section */}
          {/* ... */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingCompletedBookings ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : isErrorCompletedBookings ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-red-500">
                      Error loading completed bookings. Please try again.
                    </td>
                  </tr>
                ) : completedBookingsData && completedBookingsData.bookings.length > 0 ? (
                  completedBookingsData.bookings.map((booking, index) => {
                    const location = getLocationInfo(booking);
                    return (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(completedPage - 1) * completedEntriesCount + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(booking.bookingDate)} at {booking.startTime} - {booking.endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {location.name} ({location.facilityId})
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadge(booking.status)}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.eventName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border-blue-200"
                              onClick={() => router.push(`/booking/${booking.id}/details`)}
                            >
                              <Info className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              {completedBookingsData ? (
                `Showing ${completedBookingsData.total > 0 ? (completedPage - 1) * completedEntriesCount + 1 : 0} to ${Math.min(completedPage * completedEntriesCount, completedBookingsData.total)} of ${completedBookingsData.total} entries`
              ) : (
                "Showing 0 to 0 of 0 entries"
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                disabled={completedPage === 1}
                onClick={() => setCompletedPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              {completedBookingsData && Array.from({ length: Math.ceil(completedBookingsData.total / completedEntriesCount) }).map((_, i) => (
                <Button 
                  key={i}
                  variant={completedPage === i + 1 ? "default" : "outline"}
                  className={completedPage === i + 1 ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => setCompletedPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline"
                disabled={!completedBookingsData || completedPage >= Math.ceil(completedBookingsData.total / completedEntriesCount)}
                onClick={() => setCompletedPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}