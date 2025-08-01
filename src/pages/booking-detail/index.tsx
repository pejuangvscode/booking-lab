import { AlertTriangle, Calendar, Clock, MapPin, Users, User, Phone, Building, Info, CheckCircle, XCircle } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth, useUser } from '@clerk/nextjs';
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { api } from "~/utils/api";
import Link from "next/link";
import { format } from "date-fns";
import { useEffect } from "react";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { useCustomDialog } from "~/hooks/useCustomDialog";

export default function BookingDetailPage() {
  const { dialogState, closeDialog, confirm, success, error } = useCustomDialog();
  const router = useRouter();
  const { bookingId } = router.query;
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // Debug logging
  console.log("Detail page - bookingId:", bookingId);
  console.log("Detail page - isSignedIn:", isSignedIn);

  // Fetch booking details with corrected options
  const {
    data: booking,
    isLoading: isBookingLoading,
    error: bookingError,
    refetch
  } = api.booking.getById.useQuery(
    { 
      id: bookingId ? parseInt(bookingId as string, 10) : 0 // Convert string to number
    },
    { 
      enabled: !!bookingId && !isNaN(parseInt(bookingId as string, 10)) && isSignedIn && isLoaded,
      retry: (failureCount, error) => {
        console.error("Booking fetch error:", error);
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Remove onError - handle errors in useEffect instead
    }
  );

  // Handle errors using useEffect
  useEffect(() => {
    if (bookingError) {
      console.error("Failed to fetch booking details:", bookingError);
    }
  }, [bookingError]);

  const cancelBookingMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      success("Booking cancelled successfully!");
      void refetch();
    },
    onError: (mutationError) => { // Changed parameter name from 'error' to 'mutationError'
      console.error("Cancel booking error:", mutationError);
      error(`Error cancelling booking: ${mutationError.message}`); // Now 'error' refers to the dialog function
    }
  });

  // Loading state
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

  // Authentication check
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

  // Show loading while fetching booking
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
  
  // Error state with detailed error information
  if (bookingError || !booking) {
    console.error("Booking error details:", bookingError);
    
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {bookingError?.message || "Booking not found or you don't have permission to view it."}
            </AlertDescription>
          </Alert>
          
          {/* Debug information in development */}
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
              onClick={() => void refetch()} // Add void to suppress promise warning
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

  // Format date and time with better error handling
  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return format(date, "EEEE, MMMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
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
      console.error("Time formatting error:", error);
      return String(timeString);
    }
  };

  // Get status badge color and icon
  const getStatusDisplay = (status: string) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'confirmed':
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

  const statusDisplay = getStatusDisplay(booking.status);
  const canCancel = ['confirmed', 'pending'].includes((booking.status || '').toLowerCase());

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Booking Details | UPH Facility Booking</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
            <Badge className={`${statusDisplay.color} flex items-center gap-1`}>
              {statusDisplay.icon}
              {booking.status || 'Unknown'}
            </Badge>
          </div>
          <p className="text-gray-600">Booking ID: {booking.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {booking.eventName || 'No event name'}
                  </h3>
                  <p className="text-gray-600">{booking.eventType || 'No event type'}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(booking.bookingDate)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="font-medium">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Participants:</span>
                    <span className="font-medium">{booking.participants || 0}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Faculty:</span>
                    <span className="font-medium">{booking.faculty || 'Not specified'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Laboratory Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  Laboratory Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.room ? (
                  <>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {booking.room.name || 'Unknown Lab'}
                      </h3>
                      <p className="text-gray-600">{booking.room.type || 'Unknown Type'}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Capacity:</span>
                        <span className="ml-2 font-medium">
                          {booking.room.capacity && booking.room.capacity > 0 
                            ? `${booking.room.capacity} seats` 
                            : "Flexible space"
                          }
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-sm text-gray-600">Department:</span>
                        <span className="ml-2 font-medium">
                          {booking.room.department || 'Not specified'}
                        </span>
                      </div>
                      
                      {booking.room.facilityId && (
                        <div className="sm:col-span-2">
                          <span className="text-sm text-gray-600">Facility ID:</span>
                          <span className="ml-2 font-medium">{booking.room.facilityId}</span>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-600" />
                  Requestor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {booking.requesterName || 'Not specified'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600">NIM:</span>
                    <span className="ml-2 font-medium">
                      {booking.requesterNIM || 'Not specified'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="font-medium">{booking.phone || 'Not provided'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Status */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusDisplay.color}`}>
                    {statusDisplay.icon}
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

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canCancel && (
                  <Button 
                    variant="destructive" 
                    className="w-full hover:cursor-pointer"
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
                  <Button variant="outline" className="w-full hover:cursor-pointer mb-3">
                    Return to Dashboard
                  </Button>
                </Link>
                
                <Link href="/lab-search">
                  <Button variant="outline" className="w-full hover:cursor-pointer">
                    Book Another Lab
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
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
                        console.error("Duration calculation error:", error);
                        return "N/A";
                      }
                    })()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Type:</span>
                  <span className="font-medium">
                    {booking.room?.capacity && booking.participants >= booking.room.capacity 
                      ? "Full Room" 
                      : "Partial Room"
                    }
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Room ID:</span>
                  <span className="font-medium">{booking.roomId || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
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