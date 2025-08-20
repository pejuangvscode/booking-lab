import { useAuth, useUser } from '@clerk/nextjs';
import { 
  Calendar, 
  Clock, 
  Users, 
  Trash2, 
  AlertTriangle, 
  BookOpen,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Building,
  User,
  Phone,
  GraduationCap
} from "lucide-react";
import Head from "next/head";
import { useState, useMemo } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { Input } from "~/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "~/components/ui/select";
import { useCustomDialog } from "~/hooks/useCustomDialog";
import { api } from "~/utils/api";
import { format } from "date-fns";

interface ClassBookingGroup {
  classCode: string;
  bookings: any[];
  totalBookings: number;
  upcomingBookings: number;
  instructor: string;
  room: string;
  timeSlot: string;
  days: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export default function ManageBookingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { dialogState, closeDialog, confirm, success, error } = useCustomDialog();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedClassCodes, setSelectedClassCodes] = useState<Set<string>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);

  const {
    data: adminBookings,
    isLoading: isLoadingBookings,
    refetch: refetchBookings
  } = api.booking.getAdminBookings.useQuery(
    undefined,
    {
      enabled: isSignedIn && isLoaded,
      refetchOnWindowFocus: false
    }
  );

  const deleteClassBookingsMutation = api.booking.deleteClassBookings.useMutation({
    onSuccess: (result) => {
      success(`Successfully deleted ${result.deletedCount} bookings for class code: ${result.classCode}`);
      void refetchBookings();
    },
    onError: (err) => {
      error(`Failed to delete bookings: ${err.message}`);
    }
  });

  const bulkDeleteBookingsMutation = api.booking.bulkDeleteClassBookings.useMutation({
    onSuccess: (result) => {
      success(`Successfully deleted ${result.totalDeleted} bookings across ${result.classCount} classes`);
      setSelectedClassCodes(new Set());
      setBulkDeleteMode(false);
      void refetchBookings();
    },
    onError: (err) => {
      error(`Failed to bulk delete bookings: ${err.message}`);
    }
  });

  // Group bookings by class code
  const groupedBookings = useMemo(() => {
    if (!adminBookings) return [];

    const groups: { [key: string]: any[] } = {};
    
    adminBookings.forEach(booking => {
      // Check if equipment field contains class code (not starting with http)
      const classCode = booking.equipment;
      if (classCode && !classCode.startsWith('http')) {
        if (!groups[classCode]) {
          groups[classCode] = [];
        }
        groups[classCode].push(booking);
      }
    });

    return Object.entries(groups).map(([classCode, bookings]): ClassBookingGroup => {
      const sortedBookings = bookings.sort((a, b) => 
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );

      const upcomingBookings = bookings.filter(booking => 
        new Date(booking.bookingDate) >= new Date()
      ).length;

      // Extract common information
      const firstBooking = sortedBookings[0];
      const lastBooking = sortedBookings[sortedBookings.length - 1];
      
      // Get unique days
      const days = [...new Set(bookings.map(booking => 
        format(new Date(booking.bookingDate), 'EEEE')
      ))];

      return {
        classCode,
        bookings: sortedBookings,
        totalBookings: bookings.length,
        upcomingBookings,
        instructor: firstBooking?.requesterName || 'Unknown',
        room: firstBooking?.room?.name || firstBooking?.roomId || 'Unknown',
        timeSlot: `${firstBooking?.startTime} - ${firstBooking?.endTime}`,
        days,
        dateRange: {
          start: format(new Date(firstBooking?.bookingDate), 'MMM d, yyyy'),
          end: format(new Date(lastBooking?.bookingDate), 'MMM d, yyyy')
        }
      };
    });
  }, [adminBookings]);

  // Filter groups based on search and status
  const filteredGroups = useMemo(() => {
    return groupedBookings.filter(group => {
      const matchesSearch = group.classCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.room.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'upcoming' && group.upcomingBookings > 0) ||
                           (statusFilter === 'completed' && group.upcomingBookings === 0);

      return matchesSearch && matchesStatus;
    });
  }, [groupedBookings, searchTerm, statusFilter]);

  // Handle group expansion
  const toggleGroup = (classCode: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(classCode)) {
      newExpanded.delete(classCode);
    } else {
      newExpanded.add(classCode);
    }
    setExpandedGroups(newExpanded);
  };

  // Handle class selection for bulk delete
  const toggleClassSelection = (classCode: string) => {
    const newSelected = new Set(selectedClassCodes);
    if (newSelected.has(classCode)) {
      newSelected.delete(classCode);
    } else {
      newSelected.add(classCode);
    }
    setSelectedClassCodes(newSelected);
  };

  // Handle single class deletion
  const handleDeleteClass = async (classCode: string, totalBookings: number, upcomingBookings: number) => {
    const confirmed = await confirm(
      `Are you sure you want to delete all ${totalBookings} bookings for class "${classCode}"?\n\n` +
      `This includes ${upcomingBookings} upcoming bookings that haven't occurred yet.\n\n` +
      `This action cannot be undone.`,
      `Delete Class ${classCode}`
    );

    if (confirmed) {
      deleteClassBookingsMutation.mutate({ classCode });
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    const selectedClasses = Array.from(selectedClassCodes);
    const totalBookingsCount = selectedClasses.reduce((sum, classCode) => {
      const group = groupedBookings.find(g => g.classCode === classCode);
      return sum + (group?.totalBookings || 0);
    }, 0);

    const upcomingBookingsCount = selectedClasses.reduce((sum, classCode) => {
      const group = groupedBookings.find(g => g.classCode === classCode);
      return sum + (group?.upcomingBookings || 0);
    }, 0);

    const confirmed = await confirm(
      `Are you sure you want to delete all bookings for ${selectedClasses.length} selected classes?\n\n` +
      `Total bookings to be deleted: ${totalBookingsCount}\n` +
      `Upcoming bookings: ${upcomingBookingsCount}\n\n` +
      `Classes: ${selectedClasses.join(', ')}\n\n` +
      `This action cannot be undone.`,
      `Bulk Delete ${selectedClasses.length} Classes`
    );

    if (confirmed) {
      bulkDeleteBookingsMutation.mutate({ classCodes: selectedClasses });
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be signed in to manage bookings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Manage Class Bookings | UPH Facility Booking</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Class Bookings</h1>
            <p className="text-gray-600 mt-1">
              Manage recurring bookings grouped by class code
            </p>
          </div>
          
          {/* <div className="flex items-center gap-2">
            <Button
              onClick={() => setBulkDeleteMode(!bulkDeleteMode)}
              variant={bulkDeleteMode ? "destructive" : "outline"}
              className="whitespace-nowrap"
            >
              {bulkDeleteMode ? "Cancel" : "Bulk Delete"}
            </Button>
            {bulkDeleteMode && selectedClassCodes.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                disabled={bulkDeleteBookingsMutation.isPending}
              >
                Delete Selected ({selectedClassCodes.size})
              </Button>
            )}
          </div> */}
        </div>

        {/* Admin info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">
              Signed in as: <strong>{user?.firstName} {user?.lastName}</strong> (Admin)
            </span>
            <span className="text-blue-600">
              {filteredGroups.length} class{filteredGroups.length !== 1 ? 'es' : ''} found
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by class code, instructor, or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="upcoming">With Upcoming Bookings</SelectItem>
                  <SelectItem value="completed">Completed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Summary</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Total: {filteredGroups.length} classes
                </div>
                <div className="text-sm text-gray-600">
                  Bookings: {filteredGroups.reduce((sum, g) => sum + g.totalBookings, 0)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingBookings ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No class bookings found
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? "Try adjusting your search or filter criteria"
                : "No admin bookings with class codes found"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Class Groups List */
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.classCode} className="overflow-hidden">
              {/* Group Header */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {bulkDeleteMode && (
                      <input
                        type="checkbox"
                        checked={selectedClassCodes.has(group.classCode)}
                        onChange={() => toggleClassSelection(group.classCode)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {group.classCode}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {group.instructor}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {group.room}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {group.timeSlot}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {group.days.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Stats */}
                    <div className="text-right text-sm">
                      <div className="font-medium text-gray-900">
                        {group.totalBookings} bookings
                      </div>
                      <div className="text-gray-500">
                        {group.upcomingBookings} upcoming
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {!bulkDeleteMode && (
                        <Button
                          onClick={() => handleDeleteClass(
                            group.classCode, 
                            group.totalBookings,
                            group.upcomingBookings
                          )}
                          variant="destructive"
                          size="sm"
                          disabled={deleteClassBookingsMutation.isPending}
                          className="cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete All
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => toggleGroup(group.classCode)}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                      >
                        {expandedGroups.has(group.classCode) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div className="mt-2 text-sm text-gray-600">
                  Period: {group.dateRange.start} - {group.dateRange.end}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedGroups.has(group.classCode) && (
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Individual Bookings ({group.bookings.length})
                  </h4>
                  <div className="grid gap-3">
                    {group.bookings.map((booking, index) => (
                      <div
                        key={booking.id}
                        className={`p-3 rounded-lg border ${
                          new Date(booking.bookingDate) >= new Date()
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {format(new Date(booking.bookingDate), 'EEEE, MMM d, yyyy')}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>{booking.startTime} - {booking.endTime}</span>
                                <span className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {booking.participants}
                                </span>
                                <Badge 
                                  variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {booking.eventName && (
                            <div className="text-right text-sm text-gray-600">
                              <div className="font-medium">{booking.eventName}</div>
                              {booking.eventType && (
                                <div className="text-xs">{booking.eventType}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

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