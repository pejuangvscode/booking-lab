import { useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Phone, 
  GraduationCap, 
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Image as ImageIcon,
  ExternalLink,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import Head from 'next/head';
import { AdminProtection } from '~/components/admin-protection';

export default function AdminBookings() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected" | "completed" | "cancelled">("pending");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  // const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailBooking, setDetailBooking] = useState<any>(null);

  // const debugAuth = api.admin.debugAuth.useQuery();

  const {
    data: bookingsData,
    isLoading,
    refetch
  } = api.admin.getAllBookings.useQuery({
    status: activeTab,
    page,
    limit: 10,
    search: searchTerm
  });

  const approveMutation = api.admin.approveBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking accepted successfully!", {
        description: "The booking has been accepted and the user will be notified."
      });
      void refetch();
      // setSelectedBooking(null);
      setAdminNote("");
    },
    onError: (err) => {
      toast.error("Failed to accept booking", {
        description: err.message
      });
    }
  });

  const rejectMutation = api.admin.rejectBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking rejected successfully!", {
        description: "The booking has been rejected and the user will be notified."
      });
      void refetch();
      // setSelectedBooking(null);
      setRejectionReason("");
    },
    onError: (err) => {
      toast.error("Failed to reject booking", {
        description: err.message
      });
    }
  });

  const cancelMutation = api.admin.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled successfully!", {
        description: "The booking has been cancelled."
      });
      void refetch();
      // setSelectedBooking(null);
      setRejectionReason("");
    },
    onError: (err) => {
      toast.error("Failed to cancel booking", {
        description: err.message
      });
    }
  });

  const handleApprove = (booking: any) => {
    approveMutation.mutate({
      bookingId: booking.id,
      adminNote: adminNote
    });
  };

  const handleReject = (booking: any) => {
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    rejectMutation.mutate({
      bookingId: booking.id,
      rejectionReason: rejectionReason
    });
  };

  const handleCancel = (booking: any) => {
    cancelMutation.mutate({
      bookingId: booking.id,
      cancelReason: rejectionReason || "Cancelled by admin"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageDialog(true);
  };

  const handleRowClick = (booking: any) => {
    setDetailBooking(booking);
    setShowDetailDialog(true);
  };

  const isValidImageUrl = (url: string) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext)) || 
           url.includes('imgur.com') || 
           url.includes('cloudinary.com') ||
           url.includes('drive.google.com');
  };

  return (
    <AdminProtection>
    <div className="min-h-screen">
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
            
            {/* Lab Assignment Info */}
            {bookingsData?.userInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm sm:text-base text-blue-900">
                    {bookingsData.userInfo.canAccessAllLabs ? 'Super Admin Access' : 'Lab Assignment'}
                  </span>
                </div>
                
                {bookingsData.userInfo.canAccessAllLabs ? (
                  <p className="text-xs sm:text-sm text-blue-700">
                    You have access to manage all labs and bookings in the system.
                  </p>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm text-blue-700 mb-2">
                      You can manage bookings for the following labs:
                    </p>
                    {bookingsData.userInfo.managedLabs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {bookingsData.userInfo.managedLabs.map((lab: { id: string; name: string; facilityId: string }) => (
                          <Badge key={lab.id} className="bg-blue-100 text-blue-800 border-blue-300">
                            {lab.name} ({lab.facilityId})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600">
                        <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">!</span>
                        <span className="text-sm">
                          No labs assigned. Contact Kelvin Wiriyatama to get lab assignments.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tab */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pending" | "accepted" | "rejected" | "completed" | "cancelled")} className="mb-4 sm:mb-6">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ">
              <TabsList className="inline-flex w-full min-w-max sm:grid sm:w-full sm:grid-cols-5 bg-white rounded-lg">
                <TabsTrigger value="pending" className="flex items-center gap-1 sm:gap-2 hover:cursor-pointer whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                  <span className="hidden sm:inline">Pending</span>
                  <span className="sm:hidden">Pending</span>
                </TabsTrigger>
                <TabsTrigger value="accepted" className="flex items-center gap-1 sm:gap-2 hover:cursor-pointer whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                  <span className="hidden sm:inline">Accepted</span>
                  <span className="sm:hidden">Accept</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-1 sm:gap-2 hover:cursor-pointer whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                  <span className="hidden sm:inline">Rejected</span>
                  <span className="sm:hidden">Reject</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-1 sm:gap-2 hover:cursor-pointer whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                  <span className="hidden sm:inline">Completed</span>
                  <span className="sm:hidden">Done</span>
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="flex items-center gap-1 sm:gap-2 hover:cursor-pointer whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                  <span className="hidden sm:inline">Cancelled</span>
                  <span className="sm:hidden">Cancel</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Search */}
            <div className="mt-4 sm:mt-6 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
              <Input
                type="text"
                placeholder="Search by event, requester, or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 bg-white shadow-sm text-sm sm:text-base"
              />
            </div>

            <TabsContent value={activeTab} className="mt-6">
              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading bookings...</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && bookingsData?.bookings.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-500">
                    {bookingsData?.userInfo && !bookingsData.userInfo.canAccessAllLabs && bookingsData.userInfo.managedLabs.length === 0 
                      ? "You don't have access to any labs. Contact super admin to get lab assignments."
                      : `There are no ${activeTab} bookings at the moment.`
                    }
                  </p>
                </div>
              )}

              {/* Bookings Table */}
              {bookingsData?.bookings && bookingsData.bookings.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="w-1/4 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Event Details
                          </th>
                          <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Schedule
                          </th>
                          <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Room & Capacity
                          </th>
                          <th className="w-1/5 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Requester
                          </th>
                          <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Status
                          </th>
                          <th className="w-1/8 px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {bookingsData?.bookings.map((booking) => (
                          <tr 
                            key={booking.id} 
                            className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                            onClick={() => handleRowClick(booking)}
                          >
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-gray-900 leading-tight truncate" title={booking.eventName}>
                                  {booking.eventName}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Created {new Date(booking.createdAt).toLocaleDateString('id-ID', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </p>
                                
                                {/* Equipment/Photo - Only for completed bookings */}
                                {booking.status === "completed" && booking.equipment && (
                                  <div className="mt-2">
                                    {isValidImageUrl(booking.equipment) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleImageClick(booking.equipment!);
                                        }}
                                        className="flex items-center gap-1 text-xs px-2 py-1 h-6 border-gray-300 hover:border-gray-400 hover:cursor-pointer"
                                      >
                                        <ImageIcon className="w-3 h-3" />
                                        Completion Photo
                                      </Button>
                                    ) : (
                                      <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                        <p className="text-xs text-gray-700 truncate" title={booking.equipment}>
                                          Completion Documentation
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  {new Date(booking.bookingDate).toLocaleDateString('id-ID', { 
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  {booking.startTime} - {booking.endTime}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  <span className="truncate" title={booking.room?.name}>
                                    {booking.room?.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  {booking.participants} people
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-900 truncate" title={booking.requesterName ?? undefined}>
                                  {booking.requesterName ?? 'N/A'}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <GraduationCap className="w-3 h-3" />
                                  <span className="truncate" title={booking.faculty}>
                                    {booking.faculty}
                                  </span>
                                </div>
                                {booking.phone && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    <span className="truncate">
                                      {booking.phone}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-3">
                                {getStatusBadge(booking.status)}
                                
                                {/* Admin Notes/Rejection Reason */}
                                {booking.adminNote && (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                                    <p className="text-xs font-medium text-green-800 mb-1">Admin Note:</p>
                                    <p className="text-xs text-green-700 leading-relaxed">
                                      {booking.adminNote}
                                    </p>
                                  </div>
                                )}
                                
                                {booking.rejectionReason && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                    <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
                                    <p className="text-xs text-red-700 leading-relaxed">
                                      {booking.rejectionReason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col items-center space-y-2">
                                {/* Action Buttons for pending bookings */}
                                {booking.status === "pending" && (
                                  <>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          size="sm"
                                          className="w-20 bg-green-600 hover:bg-green-700 text-xs font-medium hover:cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // setSelectedBooking(booking);
                                          }}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Accept
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Accept Booking</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <p className="text-gray-600">
                                            Accept booking for: <strong>{booking.eventName}</strong>
                                          </p>
                                          <div>
                                            <label className="block text-sm font-medium mb-2">
                                              Admin Note (Optional)
                                            </label>
                                            <Textarea
                                              value={adminNote}
                                              onChange={(e) => setAdminNote(e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              placeholder="Add any notes for this acceptance..."
                                              rows={3}
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleApprove(booking);
                                              }}
                                              className="flex-1 bg-green-600 hover:bg-green-700 hover:cursor-pointer"
                                              disabled={approveMutation.isPending}
                                            >
                                              {approveMutation.isPending ? "Accepting..." : "Confirm Acceptance"}
                                            </Button>
                                            <DialogClose asChild>
                                              <Button 
                                                variant="outline" 
                                                className="hover:cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                Cancel
                                              </Button>
                                            </DialogClose>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="destructive"
                                          size="sm"
                                          className="w-20 bg-red-600 hover:bg-red-700 text-xs font-medium hover:cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // setSelectedBooking(booking);
                                            setRejectionReason(""); // Clear previous reason
                                          }}
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Reject
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Reject Booking</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <p className="text-gray-600">
                                            Reject booking for: <strong>{booking.eventName}</strong>
                                          </p>
                                          <div>
                                            <label className="block text-sm font-medium mb-2">
                                              Rejection Reason *
                                            </label>
                                            <Textarea
                                              value={rejectionReason}
                                              onChange={(e) => setRejectionReason(e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              placeholder="Please provide a reason for rejection..."
                                              required
                                              rows={3}
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleReject(booking);
                                              }}
                                              variant="destructive"
                                              className="flex-1"
                                              disabled={rejectMutation.isPending}
                                            >
                                              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                                            </Button>
                                            <DialogClose asChild>
                                              <Button 
                                                variant="outline" 
                                                className="hover:cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                Cancel
                                              </Button>
                                            </DialogClose>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </>
                                )}

                                {/* Cancel Button for accepted bookings */}
                                {booking.status === "accepted" && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="destructive"
                                        size="sm"
                                        className="w-20 bg-orange-600 hover:bg-orange-700 text-xs font-medium hover:cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // setSelectedBooking(booking);
                                          setRejectionReason(""); // Clear previous reason
                                        }}
                                      >
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Cancel Booking</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <p className="text-gray-600">
                                          Cancel booking for: <strong>{booking.eventName}</strong>
                                        </p>
                                        <div>
                                          <label className="block text-sm font-medium mb-2">
                                            Cancel Reason (Optional)
                                          </label>
                                          <Textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Please provide a reason for cancellation..."
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <Button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancel(booking);
                                            }}
                                            variant="destructive"
                                            className="flex-1 bg-orange-600 hover:bg-orange-700 hover:cursor-pointer"
                                            disabled={cancelMutation.isPending}
                                          >
                                            {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                                          </Button>
                                          <DialogClose asChild>
                                            <Button 
                                              variant="outline" 
                                              className="hover:cursor-pointer"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              Cancel
                                            </Button>
                                          </DialogClose>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden divide-y divide-gray-200">
                    {bookingsData?.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleRowClick(booking)}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {booking.eventName}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                Created {new Date(booking.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>

                          {/* Schedule Info */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {new Date(booking.bookingDate).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                          </div>

                          {/* Location & Requester */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{booking.room?.name}</span>
                              <span className="text-gray-400">•</span>
                              <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span>{booking.participants}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{booking.requesterName ?? 'N/A'}</span>
                            </div>
                          </div>

                          {/* Admin Notes/Rejection Reason */}
                          {booking.adminNote && (
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <p className="text-[10px] font-medium text-green-800 mb-0.5">Admin Note:</p>
                              <p className="text-xs text-green-700 line-clamp-2">
                                {booking.adminNote}
                              </p>
                            </div>
                          )}
                          {booking.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <p className="text-[10px] font-medium text-red-800 mb-0.5">Rejection:</p>
                              <p className="text-xs text-red-700 line-clamp-2">
                                {booking.rejectionReason}
                              </p>
                            </div>
                          )}

                          {/* Photo for completed */}
                          {booking.status === "completed" && booking.equipment && isValidImageUrl(booking.equipment) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageClick(booking.equipment!);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 h-auto border-gray-300 hover:border-gray-400 hover:cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              View Photo
                            </Button>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {booking.status === "pending" && (
                              <>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs font-medium hover:cursor-pointer h-8"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Accept
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md mx-4">
                                    <DialogHeader>
                                      <DialogTitle>Accept Booking</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p className="text-sm text-gray-600">
                                        Accept booking for: <strong>{booking.eventName}</strong>
                                      </p>
                                      <div>
                                        <label className="block text-sm font-medium mb-2">
                                          Admin Note (Optional)
                                        </label>
                                        <Textarea
                                          value={adminNote}
                                          onChange={(e) => setAdminNote(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="Add any notes for this acceptance..."
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprove(booking);
                                          }}
                                          className="flex-1 bg-green-600 hover:bg-green-700 hover:cursor-pointer"
                                          disabled={approveMutation.isPending}
                                        >
                                          {approveMutation.isPending ? "Accepting..." : "Confirm"}
                                        </Button>
                                        <DialogClose asChild>
                                          <Button
                                            variant="outline"
                                            className="hover:cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Cancel
                                          </Button>
                                        </DialogClose>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-xs font-medium hover:cursor-pointer h-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRejectionReason("");
                                      }}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Reject
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md mx-4">
                                    <DialogHeader>
                                      <DialogTitle>Reject Booking</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p className="text-sm text-gray-600">
                                        Reject booking for: <strong>{booking.eventName}</strong>
                                      </p>
                                      <div>
                                        <label className="block text-sm font-medium mb-2">
                                          Rejection Reason *
                                        </label>
                                        <Textarea
                                          value={rejectionReason}
                                          onChange={(e) => setRejectionReason(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="Please provide a reason for rejection..."
                                          required
                                          rows={3}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleReject(booking);
                                          }}
                                          variant="destructive"
                                          className="flex-1"
                                          disabled={rejectMutation.isPending}
                                        >
                                          {rejectMutation.isPending ? "Rejecting..." : "Confirm"}
                                        </Button>
                                        <DialogClose asChild>
                                          <Button
                                            variant="outline"
                                            className="hover:cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Cancel
                                          </Button>
                                        </DialogClose>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}

                            {booking.status === "accepted" && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-xs font-medium hover:cursor-pointer h-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRejectionReason("");
                                    }}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancel Booking
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md mx-4">
                                  <DialogHeader>
                                    <DialogTitle>Cancel Booking</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                      Cancel booking for: <strong>{booking.eventName}</strong>
                                    </p>
                                    <div>
                                      <label className="block text-sm font-medium mb-2">
                                        Cancel Reason (Optional)
                                      </label>
                                      <Textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Please provide a reason for cancellation..."
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel(booking);
                                        }}
                                        variant="destructive"
                                        className="flex-1 bg-orange-600 hover:bg-orange-700 hover:cursor-pointer"
                                        disabled={cancelMutation.isPending}
                                      >
                                        {cancelMutation.isPending ? "Cancelling..." : "Confirm"}
                                      </Button>
                                      <DialogClose asChild>
                                        <Button
                                          variant="outline"
                                          className="hover:cursor-pointer"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Cancel
                                        </Button>
                                      </DialogClose>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {bookingsData?.pagination && bookingsData.pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 mt-6 sm:mt-8">
                  <Button
                    variant="outline"
                    disabled={!bookingsData.pagination.hasPrev}
                    onClick={() => setPage(page - 1)}
                    className="bg-white hover:cursor-pointer w-full sm:w-auto text-sm"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-3 sm:px-4 py-2 bg-white rounded-md shadow-sm">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Page {bookingsData.pagination.currentPage} of {bookingsData.pagination.totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    disabled={!bookingsData.pagination.hasNext}
                    onClick={() => setPage(page + 1)}
                    className="bg-white hover:cursor-pointer w-full sm:w-auto text-sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl w-full h-[80vh]">
          <DialogHeader>
            <DialogTitle>Photo Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Booking documentation" 
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                }}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={() => router.push(selectedImage)}
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </Button>
            <DialogClose asChild>
              <Button 
                variant="outline" 
                className="hover:cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Booking Details</DialogTitle>
          </DialogHeader>
          
          {detailBooking && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {detailBooking.eventName}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Status:</strong> {getStatusBadge(detailBooking.status)}</p>
                      <p><strong>Created:</strong> {new Date(detailBooking.createdAt).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong className="text-gray-700">Booking ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded text-xs">{detailBooking.id}</code></p>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Schedule & Location */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Schedule & Location</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{new Date(detailBooking.bookingDate).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                        <p className="text-sm text-gray-600">Booking Date</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{detailBooking.startTime} - {detailBooking.endTime}</p>
                        <p className="text-sm text-gray-600">Time Duration</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{detailBooking.room?.name}</p>
                        <p className="text-sm text-gray-600">Room Location</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{detailBooking.participants} people</p>
                        <p className="text-sm text-gray-600">Expected Participants</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requester Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Requester Information</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{detailBooking.requesterName}</p>
                        <p className="text-sm text-gray-600">Full Name</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{detailBooking.faculty}</p>
                        <p className="text-sm text-gray-600">Faculty</p>
                      </div>
                    </div>
                    
                    {detailBooking.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{detailBooking.phone}</p>
                          <p className="text-sm text-gray-600">Phone Number</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment/Documentation - Only for completed bookings */}
              {detailBooking.status === "completed" && detailBooking.equipment && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Completion Documentation</h4>
                  
                  {isValidImageUrl(detailBooking.equipment) ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Completion photo uploaded:</p>
                      <div className="flex items-center gap-3">
                        <img 
                          src={detailBooking.equipment} 
                          alt="Completion Documentation" 
                          className="w-20 h-20 object-cover rounded-lg border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                          }}
                        />
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImageClick(detailBooking.equipment)}
                            className="flex items-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4" />
                            View Full Size
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(detailBooking.equipment, '_blank')}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open in New Tab
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{detailBooking.equipment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Notes/Rejection Reason */}
              {(detailBooking.adminNote || detailBooking.rejectionReason) && (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Admin Notes</h4>
                  
                  {detailBooking.adminNote && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-green-800 mb-2">Admin Note:</p>
                      <p className="text-sm text-green-700">{detailBooking.adminNote}</p>
                    </div>
                  )}
                  
                  {detailBooking.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-800 mb-2">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{detailBooking.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t">
            <DialogClose asChild>
              <Button 
                variant="outline" 
                className="hover:cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminProtection>
  );
}