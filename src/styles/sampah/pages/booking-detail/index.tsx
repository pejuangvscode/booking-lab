import { useAuth, useUser } from '@clerk/nextjs';
import { format } from "date-fns";
import { AlertTriangle, Building, Calendar, CheckCircle, Clock, Info, MapPin, User, Users, XCircle } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { useCustomDialog } from "~/hooks/useCustomDialog";
import { api } from "~/utils/api";

export default function BookingDetailPage() {
  const { dialogState, closeDialog, confirm, success, error } = useCustomDialog();
  const router = useRouter();
  const { bookingId } = router.query;
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const {
    data: booking,
    isLoading: isBookingLoading,
    error: bookingError,
    refetch
  } = api.booking.getById.useQuery(
    { 
      id: bookingId ? parseInt(bookingId as string, 10) : 0
    },
    { 
      enabled: !!bookingId && !isNaN(parseInt(bookingId as string, 10)) && isSignedIn && isLoaded,
      retry: (failureCount, error) => {
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  const {
    data: rejectionData,
    isLoading: isRejectionLoading,
    error: rejectionError
  } = api.booking.getRejectionReason.useQuery(
    { 
      id: bookingId ? parseInt(bookingId as string, 10) : 0
    },
    { 
      enabled: !!bookingId && 
              !isNaN(parseInt(bookingId as string, 10)) && 
              isSignedIn && 
              isLoaded &&
              booking?.status?.toLowerCase() === 'rejected', // Hanya jalankan jika status rejected
      retry: false,
    }
  );

  const {
    data: acceptanceData,
    isLoading: isAcceptanceLoading,
    error: acceptanceError
  } = api.booking.getAcceptedReason.useQuery(
    { 
      id: bookingId ? parseInt(bookingId as string, 10) : 0
    },
    { 
      enabled: !!bookingId && 
              !isNaN(parseInt(bookingId as string, 10)) && 
              isSignedIn && 
              isLoaded &&
              booking?.status?.toLowerCase() === 'accepted', // Hanya jalankan jika status accepted
      retry: false,
    }
  );


  const cancelBookingMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      success("Booking cancelled successfully!");
      void refetch();
    },
    onError: (mutationError) => { 
      error(`Error cancelling booking: ${mutationError.message}`);
    }
  });

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return format(date, "EEEE, MMMM d, yyyy");
    } catch (error) {
      return String(dateString);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      if (!timeString || typeof timeString !== 'string') {
        return "Invalid Time";
      }
      
      const [hours, minutes] = timeString.split(':');
      if (!hours || !minutes) {
        return timeString;
      }
      
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch (error) {
      return String(timeString);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'accepted':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: <CheckCircle className="h-4 w-4" /> 
        };
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: <Clock className="h-4 w-4" /> 
        };
      case 'cancelled':
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: <XCircle className="h-4 w-4" /> 
        };
      case 'completed':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: <CheckCircle className="h-4 w-4" /> 
        };
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: <XCircle className="h-4 w-4" /> 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: <Info className="h-4 w-4" /> 
        };
    }
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be signed in to view booking details.
            </AlertDescription>
          </Alert>
          <Link href="/sign-in" className="mt-4 inline-block">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isBookingLoading) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Validation for invalid booking ID
  if (bookingId && isNaN(parseInt(bookingId as string, 10))) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Invalid booking ID format. Please check the URL.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (bookingError || !booking) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {bookingError?.message || "Booking not found or you don't have permission to view it."}
            </AlertDescription>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && bookingError && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs text-gray-700">
              <strong>Debug Info:</strong>
              <pre>{JSON.stringify(bookingError, null, 2)}</pre>
              <p><strong>Booking ID:</strong> {bookingId}</p>
              <p><strong>User Signed In:</strong> {isSignedIn ? 'Yes' : 'No'}</p>
            </div>
          )}
          
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={() => void refetch()}
              variant="outline"
              disabled={isBookingLoading}
            >
              {isBookingLoading ? "Retrying..." : "Retry"}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // At this point, booking is guaranteed to exist
  const statusDisplay = getStatusDisplay(booking.status);
  const canCancel = ['confirmed', 'pending'].includes((booking.status || '').toLowerCase());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 relative overflow-hidden">
      <Head>
        <title>Booking Details | UPH Facility Booking</title>
      </Head>
      
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 py-8 mt-20 relative z-10">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-gray-100 animate-fadeInUp">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-orange-600 font-semibold uppercase tracking-wider">Booking Information</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">Booking Details</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2 font-medium">ID: <span className="text-orange-600 font-bold">#{booking.id}</span></p>
            </div>
            <Badge className={`${statusDisplay.color} flex items-center gap-2 px-4 py-2 text-sm sm:text-base font-bold shadow-lg border-2`}>
              {booking.status || 'Unknown'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Information */}
            <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden pt-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b-2 border-orange-200 -mt-6 pt-10 pb-2">
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-black text-lg">Event Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="bg-gradient-to-r from-orange-50 to-orange-100/30 p-4 rounded-xl border-2 border-orange-200">
                  <h3 className="font-black text-xl text-gray-900">
                    {booking.eventName || 'No event name'}
                  </h3>
                  <p className="text-orange-600 font-semibold mt-1">{booking.eventType || 'No event type'}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-medium">Date</span>
                      <p className="font-bold text-gray-900 text-sm truncate">{formatDate(booking.bookingDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-medium">Time</span>
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-medium">Participants</span>
                      <p className="font-bold text-gray-900 text-sm">{booking.participants || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Building className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-medium">Faculty</span>
                      <p className="font-bold text-gray-900 text-sm truncate">{booking.faculty || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Laboratory Information */}
            <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden pt-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b-2 border-orange-200 -mt-6 pt-10 pb-2">
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-black text-lg">Laboratory Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {booking.room ? (
                  <>
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100/30 p-4 rounded-xl border-2 border-orange-200">
                      <h3 className="font-black text-xl text-gray-900">
                        {booking.room.name || 'Unknown Lab'}
                      </h3>
                      <p className="text-orange-600 font-semibold mt-1">{booking.room.type || 'Unknown Type'}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 font-medium">Capacity</span>
                        <p className="font-bold text-gray-900 truncate">
                          {booking.room.capacity && booking.room.capacity > 0 
                            ? `${booking.room.capacity} seats` 
                            : "Flexible space"
                          }
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 font-medium">Department</span>
                        <p className="font-bold text-gray-900 truncate">
                          {booking.room.department || 'Not specified'}
                        </p>
                      </div>
                      
                      {booking.room.facilityId && (
                        <div className="sm:col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-500 font-medium">Facility ID</span>
                          <p className="font-bold text-gray-900 truncate">{booking.room.facilityId}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">Laboratory information not available</p>
                )}
              </CardContent>
            </Card>

            {/* Requestor Information */}
            <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden pt-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b-2 border-orange-200 -mt-6 pt-10 pb-2">
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-black text-lg">Requestor Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Name</span>
                    <p className="font-bold text-gray-900 truncate">
                      {booking.requesterName || 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">NIM</span>
                    <p className="font-bold text-gray-900 truncate">
                      {booking.requesterNIM || 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="sm:col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 font-medium">Phone</span>
                    <p className="font-bold text-gray-900 truncate">{booking.phone || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Status */}
            <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden pt-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 -mt-6 pt-10 pb-2">
                <CardTitle className="font-black text-gray-700">Booking Status</CardTitle>
              </CardHeader>
              <CardContent className="">
                <div className="text-center space-y-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusDisplay.color}`}>
                    <span className="font-medium">{booking.status || 'Unknown'}</span>
                  </div>
                  
                  {booking.createdAt && (
                    <div className="text-sm text-gray-600">
                      <p>Created on:</p>
                      <p className="font-medium">{formatDate(booking.createdAt)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {booking?.status?.toLowerCase() === 'rejected' && (
              <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden pt-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 -mt-6 pt-10 pb-2">
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <span className="font-black">Rejection Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="">
                  {isRejectionLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : rejectionError ? (
                    <p className="text-sm text-red-500">
                      Failed to load rejection reason
                    </p>
                  ) : rejectionData ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Reason for rejection:</p>
                      <p className="text-sm bg-red-50 p-3 rounded border border-red-200">
                        {rejectionData.rejectionReason}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No rejection reason provided
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {booking?.status?.toLowerCase() === 'accepted' && (
              <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden pt-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 -mt-6 pt-10 pb-2">
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <span className="font-black">Acceptance Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="">
                  {isAcceptanceLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : acceptanceError ? (
                    <p className="text-sm text-red-500">
                      Failed to load acceptance details
                    </p>
                  ) : acceptanceData ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Admin note:</p>
                      <p className="text-sm bg-green-50 p-3 rounded border border-green-200">
                        {acceptanceData.adminNote || 'Your booking has been approved.'}
                      </p>
                      {acceptanceData.approvedAt && (
                        <div className="text-xs text-gray-500 mt-2">
                          Accepted on: {formatDate(acceptanceData.approvedAt)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Your booking has been accepted.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden pt-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 -mt-6 pt-10 pb-2">
                <CardTitle className="font-black text-gray-700">Actions</CardTitle>
              </CardHeader>
              <CardContent className="">
                {canCancel && (
                  <Button 
                    variant="destructive" 
                    className="w-full hover:cursor-pointer bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={async () => {
                      const confirmed = await confirm(
                        "Are you sure you want to cancel this booking? This action cannot be undone.",
                        "Cancel Booking"
                      );
                      
                      if (confirmed) {
                        const numericId = parseInt(bookingId as string, 10);
                        if (!isNaN(numericId)) {
                          cancelBookingMutation.mutate({ id: numericId });
                        } else {
                          error("Invalid booking ID", "Error");
                        }
                      }
                    }}
                    disabled={cancelBookingMutation.isPending}
                  >
                    {cancelBookingMutation.isPending ? "Cancelling..." : "Cancel Booking"}
                  </Button>
                )}
                
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full hover:cursor-pointer bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 font-bold shadow-lg hover:shadow-xl transition-all duration-300 mb-2">
                    Return to Dashboard
                  </Button>
                </Link>
                
                <Link href="/lab-search">
                  <Button variant="outline" className="w-full hover:cursor-pointer bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                    Book Another Lab
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden pt-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 -mt-6 pt-10 pb-2">
                <CardTitle className="font-black text-gray-700">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-6">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-600 font-medium">Duration:</span>
                  <span className="font-bold text-gray-900">
                    {(() => {
                      try {
                        if (!booking.startTime || !booking.endTime) return "N/A";
                        
                        const start = new Date(`2000-01-01 ${booking.startTime}`);
                        const end = new Date(`2000-01-01 ${booking.endTime}`);
                        
                        if (isNaN(start.getTime()) || isNaN(end.getTime())) return "N/A";
                        
                        const diffMs = end.getTime() - start.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        return `${diffHours}h ${diffMinutes}m`;
                      } catch (error) {
                        return "N/A";
                      }
                    })()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-600 font-medium">Booking Type:</span>
                  <span className="font-bold text-gray-900">
                    {booking.room?.capacity && booking.participants >= booking.room.capacity 
                      ? "Full Room" 
                      : "Partial Room"
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-600 font-medium">Room ID:</span>
                  <span className="font-bold text-gray-900">{booking.roomId || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
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