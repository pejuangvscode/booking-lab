import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Info, XCircle, RefreshCw, Check, CheckCircle } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { api } from '~/utils/api';
import Head from 'next/head';
import { CustomDialog } from "~/components/ui/custom-dialog";
import { useCustomDialog } from "~/hooks/useCustomDialog";

type Booking = {
  id: number;
  createdAt: Date;
  userId: string;
  roomId: string;
  bookingDate: Date;
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
  const { dialogState, closeDialog, confirm, success, error } = useCustomDialog();
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleCancelBooking = async (bookingId: number) => {
    const confirmed = await confirm(
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      'Cancel Booking'
    );
    
    if (confirmed) {
      cancelBookingMutation.mutate({ id: bookingId });
    }
  };

  const cancelBookingMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      success("Booking cancelled successfully!");
      void refetchCurrentBookings();
      void refetchCompletedBookings();
    },
    onError: (err) => {
      error(`Error cancelling booking: ${err.message}`);
    }
  });

  // Format date function
  const formatDate = (date: Date | string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
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
    const locationObj = booking.lab || booking.room;
    
    if (!locationObj) {
      return { name: 'Unknown', facilityId: 'Unknown' };
    }
    
    return {
      name: locationObj.name || 'Unknown',
      facilityId: locationObj.facilityId || 'Unknown'
    };
  };

  if (!isMounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 mt-16 sm:mt-20">
      <Head>
        <title>Dashboard</title>
        <meta name="description" content="Manage your room bookings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Current Bookings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">My Bookings</h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-2">Manage your current room bookings</p>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span className="text-xs sm:text-sm">Show</span>
              <select 
                className="border rounded px-2 py-1 text-xs sm:text-sm"
                value={currentEntriesCount}
                onChange={(e) => setCurrentEntriesCount(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs sm:text-sm">entries</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="current-search" className="mr-2 text-xs sm:text-sm">Search:</label>
              <Input
                id="current-search"
                type="text"
                className="w-36 sm:w-64 text-xs sm:text-sm"
                value={currentSearchTerm}
                onChange={(e) => setCurrentSearchTerm(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchCurrentBookings()}
                className="text-orange-600 text-xs sm:text-sm"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingCurrentBookings ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-orange-600 mx-auto" />
                    </td>
                  </tr>
                ) : isErrorCurrentBookings ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-6 py-3 sm:py-4 text-center text-red-500 text-xs sm:text-sm">
                      Error loading bookings. Please try again.
                    </td>
                  </tr>
                ) : currentBookingsData && currentBookingsData.bookings.length > 0 ? (
                  currentBookingsData.bookings.map((booking, index) => {
                    const location = getLocationInfo(booking);
                    return (
                      <tr key={booking.id}>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {(currentPage - 1) * currentEntriesCount + index + 1}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          <div className="text-xs sm:text-sm">{formatDate(booking.bookingDate)}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{booking.startTime} - {booking.endTime}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{location.name}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{location.facilityId}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <Badge className={`${getStatusBadge(booking.status)} text-[10px] sm:text-xs px-2 py-0.5`}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {booking.eventName}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border-blue-200 hover:cursor-pointer text-[10px] sm:text-xs py-1 h-auto"
                              onClick={() => router.push(`/booking-detail?bookingId=${booking.id}`)}
                            >
                              <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Details
                            </Button>
                            {booking.status === 'accepted' ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600 hover:text-green-800 bg-green-100 hover:bg-green-200 border-green-200 hover:cursor-pointer text-[10px] sm:text-xs py-1 h-auto"
                                onClick={() => router.push(`/complete-booking?bookingId=${booking.id}`)}
                                disabled={cancelBookingMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Complete
                              </Button>
                            ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 border-red-200 hover:cursor-pointer text-[10px] sm:text-xs py-1 h-auto"
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancelBookingMutation.isPending}
                            >
                              {cancelBookingMutation.isPending ? ( 
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              )}
                              Cancel
                            </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-6 py-3 sm:py-4 text-center text-gray-500 text-xs sm:text-sm">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 space-y-3 sm:space-y-0">
            <div className="text-[10px] sm:text-sm text-gray-700">
              {currentBookingsData ? (
                `Showing ${currentBookingsData.total > 0 ? (currentPage - 1) * currentEntriesCount + 1 : 0} to ${Math.min(currentPage * currentEntriesCount, currentBookingsData.total)} of ${currentBookingsData.total} entries`
              ) : (
                "Showing 0 to 0 of 0 entries"
              )}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Button 
                variant="outline" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="text-[10px] sm:text-xs py-1 px-2 h-auto"
              >
                Previous
              </Button>
              {currentBookingsData && Array.from({ length: Math.min(5, Math.ceil(currentBookingsData.total / currentEntriesCount)) }).map((_, i) => (
                <Button 
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  className={`text-[10px] sm:text-xs py-1 px-2 h-auto ${currentPage === i + 1 ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline"
                disabled={!currentBookingsData || currentPage >= Math.ceil(currentBookingsData.total / currentEntriesCount)}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="text-[10px] sm:text-xs py-1 px-2 h-auto"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Bookings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 to-blue-800">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Completed Bookings</h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-2">View your past room bookings</p>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingCompletedBookings ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-600 mx-auto" />
                    </td>
                  </tr>
                ) : isErrorCompletedBookings ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-6 py-3 sm:py-4 text-center text-red-500 text-xs sm:text-sm">
                      Error loading completed bookings. Please try again.
                    </td>
                  </tr>
                ) : completedBookingsData && completedBookingsData.bookings.length > 0 ? (
                  completedBookingsData.bookings.map((booking, index) => {
                    const location = getLocationInfo(booking);
                    return (
                      <tr key={booking.id}>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {(completedPage - 1) * completedEntriesCount + index + 1}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">{formatDate(booking.bookingDate)}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{booking.startTime} - {booking.endTime}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{location.name}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{location.facilityId}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <Badge className={`${getStatusBadge(booking.status)} text-[10px] sm:text-xs px-2 py-0.5`}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {booking.eventName}
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border-blue-200 hover:cursor-pointer text-[10px] sm:text-xs py-1 h-auto"
                              onClick={() => router.push(`/booking-detail?bookingId=${booking.id}`)}
                            >
                              <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        </td>   
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-6 py-3 sm:py-4 text-center text-gray-500 text-xs sm:text-sm">
                      No data available in table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 space-y-3 sm:space-y-0">
            <div className="text-[10px] sm:text-sm text-gray-700">
              {completedBookingsData ? (
                `Showing ${completedBookingsData.total > 0 ? (completedPage - 1) * completedEntriesCount + 1 : 0} to ${Math.min(completedPage * completedEntriesCount, completedBookingsData.total)} of ${completedBookingsData.total} entries`
              ) : (
                "Showing 0 to 0 of 0 entries"
              )}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Button 
                variant="outline" 
                disabled={completedPage === 1}
                onClick={() => setCompletedPage(prev => Math.max(prev - 1, 1))}
                className="text-[10px] sm:text-xs py-1 px-2 h-auto"
              >
                Previous
              </Button>
              {completedBookingsData && Array.from({ length: Math.min(5, Math.ceil(completedBookingsData.total / completedEntriesCount)) }).map((_, i) => (
                <Button 
                  key={i}
                  variant={completedPage === i + 1 ? "default" : "outline"}
                  className={`text-[10px] sm:text-xs py-1 px-2 h-auto ${completedPage === i + 1 ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  onClick={() => setCompletedPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline"
                disabled={!completedBookingsData || completedPage >= Math.ceil(completedBookingsData.total / completedEntriesCount)}
                onClick={() => setCompletedPage(prev => prev + 1)}
                className="text-[10px] sm:text-xs py-1 px-2 h-auto"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
      <CustomDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
      />
    </div>
  );
}