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
  const [selectedBookings, setSelectedBookings] = useState<Record<string, Set<number>>>({}); // classCode -> Set<bookingId>

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

  const deleteBookingsMutation = api.booking.deleteBookings.useMutation({
    onSuccess: (result) => {
      success(`Successfully deleted ${result.deletedCount} booking(s)`);
      void refetchBookings();
      // Clear selected bookings
      setSelectedBookings({});
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

  // Handle booking selection
  const toggleBookingSelection = (classCode: string, bookingId: number) => {
    setSelectedBookings(prev => {
      const newSelected = { ...prev };
      // Create new Set to avoid mutation
      const classSet = new Set(newSelected[classCode] ?? []);
      
      if (classSet.has(bookingId)) {
        classSet.delete(bookingId);
        // Clean up empty sets
        if (classSet.size === 0) {
          delete newSelected[classCode];
        } else {
          newSelected[classCode] = classSet;
        }
      } else {
        classSet.add(bookingId);
        newSelected[classCode] = classSet;
      }
      return newSelected;
    });
  };

  // Handle select all bookings in a group
  const toggleSelectAllInGroup = (classCode: string, bookingIds: number[]) => {
    setSelectedBookings(prev => {
      const newSelected = { ...prev };
      const classSet = new Set(newSelected[classCode] ?? []);
      
      if (classSet.size === bookingIds.length) {
        // All selected, deselect all
        delete newSelected[classCode];
      } else {
        // Select all - create new Set
        newSelected[classCode] = new Set(bookingIds);
      }
      return newSelected;
    });
  };

  // Handle delete selected bookings
  const handleDeleteSelectedBookings = async (classCode: string) => {
    const selectedIds = selectedBookings[classCode];
    if (!selectedIds || selectedIds.size === 0) return;

    const confirmed = await confirm(
      `Are you sure you want to delete ${selectedIds.size} selected booking(s)?\n\n` +
      `This action cannot be undone.`,
      `Delete Selected Bookings`
    );

    if (confirmed) {
      deleteBookingsMutation.mutate({ bookingIds: Array.from(selectedIds) });
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
            <div className="grid gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden animate-pulse">
                  <div className="p-4">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center">
                      {/* Icon Skeleton */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-200 flex-shrink-0"></div>
                      
                      {/* Content Skeleton */}
                      <div className="min-w-0 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="flex gap-2">
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>

                      {/* Badges Skeleton */}
                      <div className="flex flex-col gap-1.5 items-end">
                        <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      
                      {/* Button Skeleton */}
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12">
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
            <div className="grid gap-3 sm:gap-4">
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.classCode);
                return (
                  <div
                    key={group.classCode}
                    className="bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-orange-200 transition-all duration-200"
                  >
                    {/* Summary View - Always Visible */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleGroup(group.classCode)}
                    >
                      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center">
                        
                        {/* Class Info */}
                        <div className="min-w-0 overflow-hidden">
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">{group.instructor}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {group.classCode} • {group.room}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                            <span className="flex items-center whitespace-nowrap">
                              <Clock className="h-3 w-3 mr-1" />
                              {group.timeSlot}
                            </span>
                            <span className="hidden sm:flex items-center whitespace-nowrap">
                              <Calendar className="h-3 w-3 mr-1" />
                              {group.days.join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 text-xs whitespace-nowrap">
                            {group.totalBookings} booking{group.totalBookings > 1 ? 's' : ''}
                          </Badge>
                          {group.upcomingBookings > 0 && (
                            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 text-xs whitespace-nowrap">
                              {group.upcomingBookings} upcoming
                            </Badge>
                          )}
                        </div>
                        
                        {/* Expand Button */}
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details - Only Visible When Expanded */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 space-y-4">
                        {/* Class Details */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm text-gray-700">Class Details</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Class Code</span>
                              <p className="font-semibold text-gray-900 truncate">{group.classCode}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Room</span>
                              <p className="font-semibold text-gray-900 truncate">{group.room}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Time</span>
                              <p className="font-semibold text-gray-900 truncate">{group.timeSlot}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Days</span>
                              <p className="font-semibold text-gray-900 truncate">{group.days.join(', ')}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg col-span-2">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Period</span>
                              <p className="font-semibold text-gray-900 truncate">{group.dateRange.start} - {group.dateRange.end}</p>
                            </div>
                          </div>
                        </div>

                        {/* Individual Bookings */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-gray-700">Individual Bookings ({group.bookings.length})</h4>
                              {selectedBookings[group.classCode] && selectedBookings[group.classCode]!.size > 0 && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  {selectedBookings[group.classCode]!.size} selected
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectAllInGroup(group.classCode, group.bookings.map(b => b.id));
                                }}
                                variant="outline"
                                size="sm"
                                className="cursor-pointer text-xs h-7 whitespace-nowrap"
                              >
                                {selectedBookings[group.classCode]?.size === group.bookings.length ? 'Deselect All' : 'Select All'}
                              </Button>
                              {selectedBookings[group.classCode] && selectedBookings[group.classCode]!.size > 0 && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSelectedBookings(group.classCode);
                                  }}
                                  variant="destructive"
                                  size="sm"
                                  disabled={deleteBookingsMutation.isPending}
                                  className="cursor-pointer bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-xs h-7 whitespace-nowrap"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete ({selectedBookings[group.classCode]!.size})
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5 max-h-80 overflow-y-auto">
                            {group.bookings.map((booking, index) => {
                              const isUpcoming = new Date(booking.bookingDate) >= new Date();
                              const isSelected = selectedBookings[group.classCode]?.has(booking.id) ?? false;
                              return (
                                <div 
                                  key={booking.id} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBookingSelection(group.classCode, booking.id);
                                  }}
                                  className={`flex items-center justify-between gap-2 p-2 rounded-lg transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-50 border-2 border-blue-300'
                                      : isUpcoming 
                                        ? 'bg-orange-50 border border-orange-200 hover:bg-orange-100' 
                                        : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        // Checkbox visual only, actual toggle handled by parent div
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded pointer-events-none flex-shrink-0"
                                    />
                                    <div className="w-7 h-7 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-xs text-gray-900 truncate">
                                        {format(new Date(booking.bookingDate), 'EEE, MMM d, yyyy')}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="whitespace-nowrap">{booking.startTime} - {booking.endTime}</span>
                                        <span className="flex items-center whitespace-nowrap">
                                          <Users className="h-3 w-3 mr-0.5" />
                                          {booking.participants}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <Badge 
                                    variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                                    className="text-[10px] whitespace-nowrap flex-shrink-0"
                                  >
                                    {booking.status}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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