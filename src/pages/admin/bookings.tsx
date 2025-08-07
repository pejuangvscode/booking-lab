import { useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  FileText, 
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Image,
  ExternalLink
} from "lucide-react";
import Head from 'next/head';
import { AdminAuthGuard } from '~/components/admin-auth-guard';

export default function AdminBookings() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected" | "completed">("pending");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const debugAuth = api.admin.debugAuth.useQuery();

  const getQueryStatus = () => {
    switch (activeTab) {
      case "completed":
        return "accepted";
      default:
        return activeTab;
    }
  };

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
      setSelectedBooking(null);
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
      setSelectedBooking(null);
      setRejectionReason("");
    },
    onError: (err) => {
      toast.error("Failed to reject booking", {
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageDialog(true);
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
    <AdminAuthGuard>
    <div className="min-h-screen">
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
              <TabsTrigger value="pending" className="flex items-center gap-2 hover:cursor-pointer">
                <Clock className="w-4 h-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="accepted" className="flex items-center gap-2 hover:cursor-pointer">
                <CheckCircle className="w-4 h-4" />
                Accepted
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2 hover:cursor-pointer">
                <XCircle className="w-4 h-4" />
                Rejected
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2 hover:cursor-pointer">
                <Eye className="w-4 h-4" />
                Completed
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="mt-6 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search bookings by event name, requester, or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white shadow-sm"
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
                    There are no {activeTab} bookings at the moment.
                  </p>
                </div>
              )}

              {/* Bookings Grid */}
              <div className="grid gap-6">
                {bookingsData?.bookings.map((booking) => (
                  <Card key={booking.id} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl text-gray-900 mb-2">
                            {booking.eventName}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {booking.requesterName}
                            </div>
                            <div className="flex items-center gap-1">
                              <GraduationCap className="w-4 h-4" />
                              {booking.faculty}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(booking.status)}
                          <span className="text-xs text-gray-500">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Booking Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-gray-600">Room</p>
                            <p className="font-medium text-gray-900">{booking.room?.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-xs text-gray-600">Date</p>
                            <p className="font-medium text-gray-900">
                              {new Date(booking.bookingDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="text-xs text-gray-600">Time</p>
                            <p className="font-medium text-gray-900">
                              {booking.startTime} - {booking.endTime}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                          <Users className="w-4 h-4 text-orange-600" />
                          <div>
                            <p className="text-xs text-gray-600">Participants</p>
                            <p className="font-medium text-gray-900">{booking.participants} people</p>
                          </div>
                        </div>
                      </div>

                      {/* Equipment/Photo Section */}
                      {booking.equipment && (
                        <div>
                          {isValidImageUrl(booking.equipment) ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImageClick(booking.equipment!)}
                                className="flex items-center gap-2 hover:cursor-pointer"
                              >
                                <Image className="w-4 h-4" />
                                {activeTab === "completed" ? "View Completion Photo" : "View Photo"}
                              </Button>
                              <a 
                                href={booking.equipment} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                              >
                              </a>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {booking.equipment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Admin Notes/Rejection Reason */}
                      {booking.adminNote && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-1">Admin Note</p>
                          <p className="text-sm text-green-700">{booking.adminNote}</p>
                        </div>
                      )}

                      {booking.rejectionReason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700">{booking.rejectionReason}</p>
                        </div>
                      )}

                      {/* Action Buttons - Only for pending bookings */}
                      {booking.status === "pending" && (
                        <div className="flex gap-3 pt-4 border-t">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700 hover:cursor-pointer"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
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
                                    placeholder="Add any notes for this acceptance..."
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleApprove(booking)}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={approveMutation.isPending}
                                  >
                                    {approveMutation.isPending ? "Accepting..." : "Confirm Acceptance"}
                                  </Button>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="destructive"
                                className="flex-1 bg-red-600 hover:bg-red-700 hover:cursor-pointer"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
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
                                    placeholder="Please provide a reason for rejection..."
                                    required
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleReject(booking)}
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={rejectMutation.isPending}
                                  >
                                    {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                                  </Button>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {bookingsData?.pagination && bookingsData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    disabled={!bookingsData.pagination.hasPrev}
                    onClick={() => setPage(page - 1)}
                    className="bg-white"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-4 py-2 bg-white rounded-md shadow-sm">
                    <span className="text-sm text-gray-600">
                      Page {bookingsData.pagination.currentPage} of {bookingsData.pagination.totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    disabled={!bookingsData.pagination.hasNext}
                    onClick={() => setPage(page + 1)}
                    className="bg-white"
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
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminAuthGuard>
  );
}