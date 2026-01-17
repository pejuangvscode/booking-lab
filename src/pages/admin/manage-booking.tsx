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
import { AdminProtection } from '~/components/admin-protection';

interface Booking {
  id: number;
  bookingDate: Date | string;
  startTime: string;
  endTime: string;
  equipment: string | null;
  eventName?: string;
  room?: {
    name: string;
    facilityId: string;
    capacity: number;
  };
  roomId?: string;
  userId: string;
  createdAt: Date;
  approvedBy: string | null;
  participants?: number;
  status?: string;
  eventType?: string;
}

interface ClassBookingGroup {
  classCode: string;
  bookings: Booking[];
  totalBookings: number;
  upcomingBookings: number;
  instructor: string;
  eventName: string;
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

  const groupedBookings = useMemo(() => {
    if (!adminBookings) return [];

    const groups: Record<string, Booking[]> = {};
    
    adminBookings.forEach((booking: Booking) => {
      // Check if equipment field contains class code (not starting with http)
      const classCode = booking.equipment;
      if (classCode && !classCode.startsWith('http')) {
        groups[classCode] ??= [];
        groups[classCode].push(booking);
      }
    });

    return Object.entries(groups).map(([classCode, bookings]): ClassBookingGroup => {
      const sortedBookings = bookings.sort((a: Booking, b: Booking) => 
        new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
      );

      const upcomingBookings = bookings.filter((booking: Booking) => 
        new Date(booking.bookingDate) >= new Date()
      ).length;

      // Extract common information
      const firstBooking = sortedBookings[0]!;
      const lastBooking = sortedBookings[sortedBookings.length - 1]!;
      
      // Get unique days
      const days = [...new Set(bookings.map((booking: Booking) => 
        format(new Date(booking.bookingDate), 'EEEE')
      ))];

      return {
        classCode,
        bookings: sortedBookings,
        totalBookings: bookings.length,
        upcomingBookings,
        instructor: firstBooking?.eventName ?? 'Unknown',
        eventName: firstBooking?.eventName ?? 'Unknown',
        room: firstBooking?.room?.name ?? firstBooking?.roomId ?? 'Unknown',
        timeSlot: `${firstBooking?.startTime ?? 'Unknown'} - ${firstBooking?.endTime ?? 'Unknown'}`,
        days,
        dateRange: {
          start: format(new Date(firstBooking?.bookingDate ?? new Date()), 'MMM d, yyyy'),
          end: format(new Date(lastBooking?.bookingDate ?? new Date()), 'MMM d, yyyy')
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
  const handleDeleteClass = async (classCode: string, totalBookings: number, upcomingBookings: number, eventName: string) => {
    const confirmed = await confirm(
      `Are you sure you want to delete all ${totalBookings} bookings for class "${classCode}"?\n\n` +
      `Event: ${eventName}\n` +
      `This includes ${upcomingBookings} upcoming bookings that haven't occurred yet.\n\n` +
      `This action cannot be undone.`,
      `Delete Class ${classCode}`
    );

    if (confirmed) {
      deleteClassBookingsMutation.mutate({ classCode });
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
    <AdminProtection>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 relative overflow-hidden">
      <Head>
        <title>Manage Class Bookings</title>
      </Head>
      
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-16 sm:mt-20 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                Manage Class Bookings
              </h1>
            </div>
            
            {/* Admin info */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="text-orange-900 font-medium">
                  Signed in as: <strong>{user?.firstName} {user?.lastName}</strong> (Admin)
                </span>
                <span className="text-orange-700 font-semibold">
                  {filteredGroups.length} class{filteredGroups.length !== 1 ? 'es' : ''} found
                </span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 sm:mb-8 bg-white rounded-2xl shadow-xl border-2 border-orange-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 px-6 py-4">
              <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white mb-1">
                <Filter className="h-5 w-5 sm:h-6 sm:w-6" />
                Filters & Search
              </h2>
              <p className="text-orange-50 text-sm">Search dan filter class bookings</p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Search */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    placeholder="Search by class code, instructor, or room..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 bg-white hover:border-orange-300 focus:ring-orange-200"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="hover:cursor-pointer bg-white hover:border-orange-300 focus:ring-orange-200">
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Summary</label>
                <div className="p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <div className="text-sm text-orange-900 font-semibold">
                    Total: {filteredGroups.length} classes
                  </div>
                  <div className="text-sm text-orange-900 font-semibold">
                    Bookings: {filteredGroups.reduce((sum, g) => sum + g.totalBookings, 0)}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
          {isLoadingBookings ? (
            <div className="text-center py-12">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-[3px] border-gray-100"></div>
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-orange-500 border-r-orange-400 animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-800 font-semibold">Loading bookings...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No class bookings found
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? "Try adjusting your search or filter criteria"
                  : "No admin bookings with class codes found"
                }
              </p>
            </div>
          ) : (
            /* Class Groups List */
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Card key={group.classCode} className="overflow-hidden bg-white rounded-2xl shadow-xl border-2 border-orange-100">
                  {/* Group Header */}
                  <div className="p-4 sm:p-6 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 border-b-2 border-orange-400">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        {bulkDeleteMode && (
                          <input
                            type="checkbox"
                            checked={selectedClassCodes.has(group.classCode)}
                            onChange={() => toggleClassSelection(group.classCode)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-white truncate">
                            {group.instructor}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-orange-50">
                            <span className="flex items-center whitespace-nowrap">
                              <Building className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 flex-shrink-0" />
                              <span className="truncate">{group.room}</span>
                            </span>
                            <span className="flex items-center whitespace-nowrap">
                              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 flex-shrink-0" />
                              {group.timeSlot}
                            </span>
                            <span className="flex items-center whitespace-nowrap">
                              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 flex-shrink-0" />
                              {group.days.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Stats */}
                        <div className="text-right text-xs sm:text-sm">
                          <div className="font-bold text-white">
                            {group.totalBookings} bookings
                          </div>
                          <div className="text-orange-100">
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
                                group.upcomingBookings,
                                group.eventName
                              )}
                              variant="destructive"
                              size="sm"
                              disabled={deleteClassBookingsMutation.isPending}
                              className="cursor-pointer bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm h-9"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Delete All</span>
                              <span className="sm:hidden">Delete</span>
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => toggleGroup(group.classCode)}
                            variant="outline"
                            size="sm"
                            className="cursor-pointer bg-white hover:bg-orange-50 border-2 border-white hover:border-orange-200 text-xs sm:text-sm h-9 w-9 sm:w-auto p-0 sm:px-3 shadow-sm transition-all duration-300"
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
                    <div className="mt-3 text-xs sm:text-sm text-orange-100 font-medium">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      Period: {group.dateRange.start} - {group.dateRange.end}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedGroups.has(group.classCode) && (
                    <div className="p-4 sm:p-6 bg-gray-50">
                      <h4 className="font-bold text-base sm:text-lg text-gray-900 mb-4">
                        Individual Bookings ({group.bookings.length})
                      </h4>
                      <div className="grid gap-2 sm:gap-3">
                        {group.bookings.map((booking, index) => (
                          <div
                            key={booking.id}
                            className={`p-2 sm:p-3 rounded-lg border ${
                              new Date(booking.bookingDate) >= new Date()
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 sm:space-x-4">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-200 text-orange-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium flex-shrink-0">
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                                    {format(new Date(booking.bookingDate), 'EEEE, MMM d, yyyy')}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                    <span className="whitespace-nowrap">{booking.startTime} - {booking.endTime}</span>
                                    <span className="flex items-center whitespace-nowrap">
                                      <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                                      {booking.participants}
                                    </span>
                                    <Badge 
                                      variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                                      className="text-[10px] sm:text-xs"
                                    >
                                      {booking.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {booking.eventName && (
                                <div className="text-right text-xs sm:text-sm text-gray-600">
                                  <div className="font-medium truncate">{booking.eventName}</div>
                                  {booking.eventType && (
                                    <div className="text-[10px] sm:text-xs truncate">{booking.eventType}</div>
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
    </AdminProtection>
  );
}