import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Info, XCircle, RefreshCw, Check, CheckCircle, ToggleLeft } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { api } from '~/utils/api';
import Head from 'next/head';
import { CustomDialog } from "~/components/ui/custom-dialog";
import { useCustomDialog } from "~/hooks/useCustomDialog";
import { useAdminCheck } from '~/hooks/useAdminCheck';

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
  const { isAdmin } = useAdminCheck();
  
  const [currentEntriesCount, setCurrentEntriesCount] = useState(10);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
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
      cancelBookingMutation.mutate({ id: bookingId, cancelReason: "Cancelled by user" });
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
        return "bg-amber-50 text-amber-700 border-0";
      case 'accepted':
        return "bg-green-50 text-green-700 border-0";
      case 'rejected':
        return "bg-red-50 text-red-700 border-0";
      case 'cancelled':
        return "bg-gray-100 text-gray-600 border-0";
      case 'completed':
        return "bg-blue-50 text-blue-700 border-0";
      default:
        return "bg-blue-50 text-blue-700 border-0";
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
    <div className="min-h-screen bg-neutral-50">
      <Head>
        <title>Dashboard - BookLab</title>
        <meta name="description" content="Manage your room bookings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="container mx-auto px-4 py-6 sm:py-8 mt-16 sm:mt-20 relative z-10">
      {/* Current Bookings Section */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:mb-8">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-orange-600">Active bookings</p>
          <h2 className="mt-1 text-lg font-medium tracking-tight text-gray-900 sm:text-xl">My current bookings</h2>
          <p className="mt-1 text-sm text-gray-500">Manage and track your active reservations</p>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Show</span>
              <select 
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium focus:border-orange-400 focus:outline-none"
                value={currentEntriesCount}
                onChange={(e) => setCurrentEntriesCount(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs sm:text-sm font-medium text-gray-700">entries</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="current-search" className="mr-2 text-xs sm:text-sm font-medium text-gray-700">Search:</label>
              <Input
                id="current-search"
                type="text"
                className="w-36 sm:w-64 text-xs sm:text-sm rounded-lg border-gray-200 focus-visible:border-orange-400"
                value={currentSearchTerm}
                onChange={(e) => setCurrentSearchTerm(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchCurrentBookings()}
                className="border-gray-200 text-gray-700 text-xs sm:text-sm hover:cursor-pointer hover:bg-gray-50"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoadingCurrentBookings ? (
                  <>
                    {[...Array(currentEntriesCount)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-8"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-36"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <div className="h-8 bg-gray-200 rounded w-20"></div>
                            <div className="h-8 bg-gray-200 rounded w-20"></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
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
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                          {(currentPage - 1) * currentEntriesCount + index + 1}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{formatDate(booking.bookingDate)}</div>
                          <div className="text-[10px] sm:text-xs text-gray-600 font-medium">{booking.startTime} - {booking.endTime}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
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
                              className="border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:cursor-pointer text-[10px] sm:text-xs py-1.5 h-auto font-medium"
                              onClick={() => router.push(`/booking-detail?bookingId=${booking.id}`)}
                            >
                              Details
                            </Button>
                            {booking.status === 'accepted' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="bg-green-600 text-white hover:bg-green-700 border-0 hover:cursor-pointer text-[10px] sm:text-xs py-1.5 h-auto font-medium"
                                  onClick={() => router.push(`/complete-booking?bookingId=${booking.id}`)}
                                  disabled={cancelBookingMutation.isPending}
                                >
                                  Complete
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:cursor-pointer text-[10px] sm:text-xs py-1.5 h-auto font-medium"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={cancelBookingMutation.isPending}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:cursor-pointer text-[10px] sm:text-xs py-1.5 h-auto font-medium"
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={cancelBookingMutation.isPending}
                              >
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
                className="text-[10px] sm:text-xs py-1.5 px-3 h-auto font-medium rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Previous
              </Button>
              {currentBookingsData && Array.from({ length: Math.min(5, Math.ceil(currentBookingsData.total / currentEntriesCount)) }).map((_, i) => (
                <Button 
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  className={`text-[10px] sm:text-xs py-1.5 px-3 h-auto font-medium rounded-lg transition-all duration-300 ${
                    currentPage === i + 1 
                      ? "bg-gray-900 text-white border-0" 
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline"
                disabled={!currentBookingsData || currentPage >= Math.ceil(currentBookingsData.total / currentEntriesCount)}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="text-[10px] sm:text-xs py-1.5 px-3 h-auto font-medium rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Bookings Section */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">History</p>
          <h2 className="mt-1 text-lg font-medium tracking-tight text-gray-900 sm:text-xl">Completed bookings</h2>
          <p className="mt-1 text-sm text-gray-500">Review your booking history and past activities</p>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoadingCompletedBookings ? (
                  <>
                    {[...Array(completedEntriesCount)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-8"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-36"></div>
                        </td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="h-8 bg-gray-200 rounded w-20"></div>
                        </td>
                      </tr>
                    ))}
                  </>
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
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium">
                          {(completedPage - 1) * completedEntriesCount + index + 1}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{formatDate(booking.bookingDate)}</div>
                          <div className="text-[10px] sm:text-xs text-gray-600 font-medium">{booking.startTime} - {booking.endTime}</div>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
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
                              className="border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:cursor-pointer text-[10px] sm:text-xs py-1.5 h-auto font-medium"
                              onClick={() => router.push(`/booking-detail?bookingId=${booking.id}`)}
                            >
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
                className="text-[10px] sm:text-xs py-1.5 px-3 h-auto font-medium rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Previous
              </Button>
              {completedBookingsData && Array.from({ length: Math.min(5, Math.ceil(completedBookingsData.total / completedEntriesCount)) }).map((_, i) => (
                <Button 
                  key={i}
                  variant={completedPage === i + 1 ? "default" : "outline"}
                  className={`text-[10px] sm:text-xs py-1.5 px-3 h-auto font-medium rounded-lg transition-all duration-300 ${
                    completedPage === i + 1 
                      ? "bg-gray-900 text-white border-0" 
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setCompletedPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button 
                variant="outline"
                disabled={!completedBookingsData || completedPage >= Math.ceil(completedBookingsData.total / completedEntriesCount)}
                onClick={() => setCompletedPage(prev => prev + 1)}
                className="text-[10px] sm:text-xs py-1.5 px-3 h-auto font-medium rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
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