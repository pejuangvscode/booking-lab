import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { Loader2, CheckCircle, AlertTriangle, Calendar, Clock, Users, MapPin, User, ArrowLeft } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { api } from '~/utils/api';
import Head from 'next/head';
import PhotoUpload from '~/components/photo-upload';

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
  equipment?: string | null;
  requesterName: string | null;
  requesterNIM: string | null;
  room?: {
    name: string;
    facilityId: string;
  };
};

export default function CompleteBooking() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { bookingId } = router.query;
  const [isMounted, setIsMounted] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    title: string;
    message: string;
    variant: 'success' | 'error' | 'info';
  } | null>(null);

  // Custom dialog functions
  const showMessage = (config: typeof messageConfig) => {
    setMessageConfig(config);
    setShowMessageDialog(true);
  };

  // Use getAllBookings without parameters (as defined in your router)
  const {
    data: allBookingsData,
    isLoading: isLoadingBookings,
    isError: isErrorBookings,
    refetch: refetchBookings
  } = api.booking.getAllBookings.useQuery(
    undefined,
    {
      enabled: isSignedIn && isMounted,
      refetchOnWindowFocus: false
    }
  );

  // Use getById for specific booking if bookingId is provided
  const {
    data: specificBookingData,
    isLoading: isLoadingSpecificBooking,
    isError: isErrorSpecificBooking,
    refetch: refetchSpecificBooking
  } = api.booking.getById.useQuery(
    { id: parseInt(bookingId as string) },
    {
      enabled: isSignedIn && isMounted && !!bookingId && !isNaN(parseInt(bookingId as string)),
      refetchOnWindowFocus: false
    }
  );

  // We need to add updateBooking mutation to your router first
  // For now, let's create a simple mutation that updates the status
  const updateBookingMutation = api.booking.updateBooking.useMutation({
    onSuccess: () => {
      showMessage({
        title: "Success",
        message: "Booking completed successfully with photo uploaded!",
        variant: "success"
      });
      void refetchBookings();
      void refetchSpecificBooking();
      setShowConfirmDialog(false);
      setSelectedBooking(null);
    },
    onError: (err) => {
      console.error("Complete booking error:", err);
      showMessage({
        title: "Error",
        message: `Error completing booking: ${err.message}`,
        variant: "error"
      });
      setShowConfirmDialog(false);
    }
  });

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

  // Set selected booking when specific booking data is loaded
  useEffect(() => {
    if (specificBookingData) {
      setSelectedBooking(specificBookingData);
    }
  }, [specificBookingData]);

  const handleCompleteBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowConfirmDialog(true);
  };

  const confirmComplete = () => {
    if (selectedBooking) {
      updateBookingMutation.mutate({ 
        id: selectedBooking.id,
        status: "completed"
      });
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

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
      case 'accepted':
      case 'approved':
        return "bg-green-100 hover:bg-green-200 text-green-800 border-0";
      case 'completed':
        return "bg-blue-100 hover:bg-blue-200 text-blue-800 border-0";
      default:
        return "bg-gray-100 hover:bg-gray-200 text-gray-800 border-0";
    }
  };

  // Helper function to get location info
  const getLocationInfo = (booking: Booking) => {
    if (booking.room) {
      return {
        name: booking.room.name || 'Unknown',
        facilityId: booking.room.facilityId || 'Unknown'
      };
    }
    return { 
      name: booking.roomId || 'Unknown', 
      facilityId: 'Unknown' 
    };
  };

  // Get current bookings data
  const currentBookings = allBookingsData || [];
  const acceptedBookings = currentBookings.filter((booking: Booking) => 
    booking.status.toLowerCase() === 'accepted' || booking.status.toLowerCase() === 'approved'
  );

  const isLoading = isLoadingBookings || (bookingId && isLoadingSpecificBooking);
  const isError = isErrorBookings || (bookingId && isErrorSpecificBooking);

  if (!isLoaded || !isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  // Handle specific booking view
  if (bookingId) {
    // Loading state
    if (isLoadingSpecificBooking) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      );
    }

    // Error state or booking not found
    if (isErrorSpecificBooking || !specificBookingData) {
      return (
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Error loading booking details or booking not found</p>
            <Button onClick={handleBackToDashboard} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    const booking = specificBookingData;
    const location = getLocationInfo(booking);

    return (
      <>
        <Head>
          <title>Complete Booking | BookLab</title>
          <meta name="description" content="Complete your booking" />
        </Head>

        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              className="mb-6 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            {/* Booking Details Card */}
            <Card className="border border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  Complete Booking
                </CardTitle>
                <CardDescription className="text-green-100">
                  Review and complete this booking
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {/* Booking Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Current Status:</span>
                  <Badge className={getStatusBadge(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>

                {/* Event Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Event Name:</span>
                        <p className="text-gray-900">{booking.eventName}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Event Type:</span>
                        <p className="text-gray-900">{booking.eventType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">Location:</span>
                        <p className="text-gray-900">{location.name}</p>
                        <p className="text-sm text-gray-500">{location.facilityId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">Date:</span>
                        <p className="text-gray-900">{formatDate(booking.bookingDate)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">Time:</span>
                        <p className="text-gray-900">{booking.startTime} - {booking.endTime}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">Participants:</span>
                        <p className="text-gray-900">{booking.participants} people</p>
                      </div>
                    </div>
                  </div>

                  {/* Requester Info */}
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-600">Requester:</span>
                      <p className="text-gray-900">{booking.requesterName || 'N/A'}</p>
                      {booking.requesterNIM && (
                        <p className="text-sm text-gray-500">NIM: {booking.requesterNIM}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-200">
                  {(booking.status.toLowerCase() === 'accepted' || booking.status.toLowerCase() === 'approved') ? (
                    <PhotoUpload
                      onComplete={(photoUrl) => {
                        console.log("Photo uploaded, URL:", photoUrl); // Add logging
                        updateBookingMutation.mutate({ 
                          id: booking.id,
                          status: "completed",
                          equipment: photoUrl // Pastikan menggunakan equipment bukan equipment
                        });
                      }}
                      isLoading={updateBookingMutation.isLoading}
                      disabled={false}
                    />
                  ) : booking.status.toLowerCase() === 'completed' ? (
                    <div className="text-center py-6 bg-blue-50 rounded-lg border border-blue-200">
                      <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <span className="text-blue-700 font-medium">This booking has already been completed</span>
                      {booking.equipment && (
                        <div className="mt-3">
                          <a 
                            href={booking.equipment} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            View completion photo
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                      <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-gray-600">Booking must be accepted before completion</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Complete Booking
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600 mb-4">
                Are you sure you want to mark this booking as completed?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="font-medium">{booking.eventName}</div>
                <div className="text-sm text-gray-600">
                  {location.name} ({location.facilityId})
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(booking.bookingDate)} • {booking.startTime} - {booking.endTime}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={updateBookingMutation.isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmComplete}
                className="bg-green-600 hover:bg-green-700 hover:cursor-pointer"
                disabled={updateBookingMutation.isLoading}
              >
                {updateBookingMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Completing...
                  </>
                ) : (
                  'Complete Booking'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${
                messageConfig?.variant === 'success' ? 'text-green-600' :
                messageConfig?.variant === 'error' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {messageConfig?.variant === 'success' ? <CheckCircle className="h-5 w-5" /> :
                 <AlertTriangle className="h-5 w-5" />}
                {messageConfig?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">{messageConfig?.message}</p>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => {
                  setShowMessageDialog(false);
                  if (messageConfig?.variant === 'success') {
                    handleBackToDashboard();
                  }
                }}
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Handle general complete booking page (list view)
  return (
    <>
      <Head>
        <title>Complete Booking | BookLab</title>
        <meta name="description" content="Complete accepted bookings" />
      </Head>

      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Complete Bookings</h1>
            <p className="text-gray-600 mt-1">Mark accepted bookings as completed</p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                <span className="ml-2 text-gray-600">Loading bookings...</span>
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">Error loading bookings</p>
                <Button onClick={() => void refetchBookings()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : !acceptedBookings.length ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No accepted bookings found</p>
                <p className="text-gray-500 text-sm">All bookings have been processed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {acceptedBookings.map((booking: Booking) => {
                  const location = getLocationInfo(booking);
                  return (
                    <Card key={booking.id} className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">{booking.eventName}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {location.name} ({location.facilityId})
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(booking.bookingDate)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {booking.startTime} - {booking.endTime}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <Badge className={getStatusBadge(booking.status)}>
                              {booking.status}
                            </Badge>
                            <Button
                              onClick={() => router.push(`/complete-booking?bookingId=${booking.id}`)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}