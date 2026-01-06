import { useAuth } from '@clerk/nextjs';
import { format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useUser } from '@clerk/nextjs';
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Filter, X, Check } from "lucide-react";
import Head from 'next/head';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { api } from "~/utils/api";
import { startOfWeek, getDay } from 'date-fns';


const locales = {
  'en-US': enUS,
};


const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const bookingFormSchema = z.object({
  roomId: z.string().min(1, { message: "Please select a room" }),
  title: z.string().min(3, { message: "Event title must be at least 3 characters" }),
  description: z.string().optional(),
  start: z.date(),
  end: z.date(),
});


// Single color per room type
const getColorForRoom = (roomType: string): string => {
  return roomType === 'staff_room' ? '#F97316' : '#3B82F6'; // Orange for staff, Blue for students
};

type BookingEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  roomId: string;
  bookedBy: string;
  description?: string;
  status?: string;
  bookingType?: 'full' | 'partial';
  participants?: number; 
  roomCapacity?: number;
};

export default function BookingCalendar() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMoreEventsModal, setShowMoreEventsModal] = useState(false);
  const [moreEventsData, setMoreEventsData] = useState<{
    date: Date;
    events: BookingEvent[];
  } | null>(null);

  const [selectedRoomFilters, setSelectedRoomFilters] = useState<string[]>([]);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const form = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: "",
      title: "",
      description: "",
      start: new Date(),
      end: new Date(),
    }
  });
  
  // Fetch labs from database
  const { data: labsData, isLoading: isLoadingLabs } = api.lab.getAll.useQuery(
    undefined,
    {
      enabled: isMounted,
      refetchOnWindowFocus: false,
    }
  );

  // Transform labs data for use in calendar
  const rooms = useMemo(() => {
    return labsData?.map(lab => ({
      id: lab.facilityId,
      name: lab.name,
      capacity: lab.capacity,
      roomType: lab.roomType,
    })) ?? [];
  }, [labsData]);

  // Separate rooms by type
  const studentLabs = useMemo(() => 
    rooms.filter(room => room.roomType === 'student_lab'),
    [rooms]
  );
  const staffRooms = useMemo(() => 
    rooms.filter(room => room.roomType === 'staff_room'),
    [rooms]
  );

  // Memoize room colors to prevent infinite loop
  const roomColors = useMemo(() => {
    const colors: Record<string, string> = {};
    rooms.forEach(room => {
      colors[room.id] = getColorForRoom(room.roomType ?? 'student_lab');
    });
    return colors;
  }, [rooms]);

  const { 
    data: bookingsData, 
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch: refetchBookings
  } = api.booking.getAllBookings.useQuery(
    {
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1, // JavaScript months are 0-indexed, backend expects 1-indexed
    },
    {
      enabled: isMounted,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }
  );

  const getFilteredEvents = (events: BookingEvent[]) => {
    if (selectedRoomFilters.length === 0) {
      return events;
    }
    return events.filter(event => selectedRoomFilters.includes(event.roomId));
  };

  const handleRoomFilterChange = (roomId: string, checked: boolean) => {
    setSelectedRoomFilters(prev => {
      if (checked) {
        return [...prev, roomId];
      } else {
        return prev.filter(id => id !== roomId);
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedRoomFilters([]);
  };

  const selectAllRooms = () => {
    setSelectedRoomFilters(rooms.map(room => room.id));
  };

  const generateSkeletonEvents = (): BookingEvent[] => {
    const skeletonEvents: BookingEvent[] = [];
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    // Generate skeleton for every day in the visible calendar (including prev/next month days)
    const firstDayOfMonth = currentMonthStart.getDay(); // 0 = Sunday
    const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;
    
    // Start from the first visible day (may be from previous month)
    const calendarStart = new Date(currentMonthStart);
    calendarStart.setDate(calendarStart.getDate() - firstDayOfMonth);
    
    for (let i = 0; i < totalCells; i++) {
      const currentDate = new Date(calendarStart);
      currentDate.setDate(currentDate.getDate() + i);
      
      // Add 1-2 skeleton events per day
      const eventsPerDay = Math.random() > 0.5 ? 2 : 1;
      
      for (let j = 0; j < eventsPerDay; j++) {
        const randomHour = Math.floor(Math.random() * 9) + 8; // 8-16
        const startDate = new Date(currentDate.setHours(randomHour, 0, 0, 0));
        const endDate = new Date(startDate.getTime() + (1.5 * 60 * 60 * 1000)); // 1.5 hours
        
        skeletonEvents.push({
          id: `skeleton-${i}-${j}`,
          title: '',
          start: startDate,
          end: endDate,
          roomId: '',
          bookedBy: '',
          status: 'skeleton',
        });
      }
    }
    
    return skeletonEvents;
  };

  const limitEventsPerDay = (events: BookingEvent[], limit: number = 2) => {
    const filteredEvents = getFilteredEvents(events).filter(event => 
      event.status?.toLowerCase() !== 'cancelled' &&
      event.status?.toLowerCase() !== 'rejected'
    );

    const eventsByDate: Record<string, BookingEvent[]> = {};
    
    filteredEvents.forEach(event => {
      try {
        const dateKey = format(event.start, 'yyyy-MM-dd');
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      } catch (error) {
        console.error('Error formatting date for event:', event.id, error);
      }
    });
    
    const limitedEvents: BookingEvent[] = [];
    
    Object.entries(eventsByDate).forEach(([dateKey, dayEvents]) => {
      const sortedEvents = dayEvents.sort((a, b) => {
        try {
          const timeA = a.start.getTime();
          const timeB = b.start.getTime();
          return timeA - timeB;
        } catch (error) {
          console.error('Error comparing event times:', error);
          return 0;
        }
      });
      
      const visibleEvents = sortedEvents.slice(0, limit);
      limitedEvents.push(...visibleEvents);
      
      if (sortedEvents.length > limit) {
        const overflowCount = sortedEvents.length - limit;
        const lastVisibleEvent = visibleEvents[visibleEvents.length - 1];
        
        if (lastVisibleEvent && lastVisibleEvent.end) {
          try {
            const moreEvent: BookingEvent = {
              id: `more-${dateKey}`,
              title: `+${overflowCount} more`,
              start: new Date(lastVisibleEvent.end.getTime()),
              end: new Date(lastVisibleEvent.end.getTime() + 30 * 60 * 1000),
              roomId: 'MORE',
              bookedBy: '',
              description: `${overflowCount} additional events on this date`,
              status: 'overflow',
              bookingType: 'partial',
              participants: overflowCount,
              roomCapacity: 0,
            };
            limitedEvents.push(moreEvent);
          } catch (error) {
            console.error('Error creating more event:', error);
          }
        }
      }
    });
    
    return limitedEvents;
  };

  const [events, setEvents] = useState<BookingEvent[]>([]);
  const checkConflictsQuery = api.booking.checkConflicts.useQuery(
    {
      labId: "",
      bookingDate: "",
      startTime: "",
      endTime: "",
      participants: 1,
      bookingType: "full"
    },
    {
      enabled: false,
    }
  );
  
  useEffect(() => {
    if (bookingsData && rooms.length > 0) {      
      const transformedEvents = bookingsData
        .filter(booking => 
          // Filter out cancelled AND rejected bookings
          booking.status?.toLowerCase() !== 'cancelled' && 
          booking.status?.toLowerCase() !== 'rejected'
        )
        .map(booking => {
          let startDate, endDate;
          
          try {
            const bookingDateStr = typeof booking.bookingDate === 'object' 
              ? (booking.bookingDate as Date).toISOString().split('T')[0]
              : new Date(String(booking.bookingDate)).toISOString().split('T')[0];
            
            startDate = new Date(`${bookingDateStr}T${booking.startTime}`);
            endDate = new Date(`${bookingDateStr}T${booking.endTime}`);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.error("Invalid date detected:", { booking, startDate, endDate });
              return null;
            }
            
          } catch (error) {
            return null;
          }
          
          const matchedRoom = rooms.find(room => 
            room.id === booking.roomId || 
            room.id === booking.room?.facilityId || 
            room.name.includes(booking.room?.facilityId || '')
          );

          const roomCapacity = matchedRoom?.capacity || 0;

          let bookingType: 'full' | 'partial' = 'partial';
          if (roomCapacity === 0) {
            bookingType = 'full'; 
          } else if (booking.participants >= roomCapacity) {
            bookingType = 'full';
          }
          
          return {
            id: String(booking.id),
            title: booking.eventName || "Unnamed Event",
            start: startDate,
            end: endDate,
            roomId: booking.room?.facilityId || matchedRoom?.name || "Unknown",
            bookedBy: booking.requesterName || (booking.user ? `User ID: ${booking.user.id.substring(0, 6)}...` : "Unknown"),
            description: booking.eventType || "No description",
            status: booking.status || "pending",
            bookingType: bookingType,
            participants: booking.participants || 0,
            roomCapacity: roomCapacity,
          };
        })
        .filter(Boolean);
      
      setEvents(transformedEvents as BookingEvent[]);
    }
  }, [bookingsData, rooms]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const eventStyleGetter = (event: BookingEvent) => {
    if (event.status === 'skeleton') {
      return {
        style: {
          backgroundColor: '#e5e7eb',
          color: 'transparent',
          borderRadius: '4px',
          border: '1px solid #d1d5db',
          cursor: 'default',
        }
      };
    }
    
    if (event.status === 'overflow') {
      return {
        style: {
          backgroundColor: '#6b7280',
          color: 'white',
          borderRadius: '4px',
          border: '1px solid #9ca3af',
          fontStyle: 'italic',
          textAlign: 'center' as const,
        }
      };
    }

    const color = roomColors[event.roomId] || '#3B82F6';

    const baseStyle = {
      backgroundColor: color,
      color: 'white',
      borderRadius: '4px',
      border: 'none',
    };

    return { style: baseStyle };
  };

  const handleMoreEventsClick = (dateKey: string) => {
    try {
      const allEventsForDate = getFilteredEvents(events)
        .filter(e => {
          try {
            if (!e.start || isNaN(e.start.getTime())) return false;
            const eventDateKey = format(e.start, 'yyyy-MM-dd');
            return eventDateKey === dateKey;
          } catch (error) {
            console.error('Error filtering event:', e.id, error);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            return a.start.getTime() - b.start.getTime();
          } catch (error) {
            console.error('Error sorting events:', error);
            return 0;
          }
        });

      setMoreEventsData({
        date: new Date(dateKey + 'T12:00:00'),
        events: allEventsForDate
      });
      setShowMoreEventsModal(true);
    } catch (error) {
      console.error('Error handling more events click:', error);
    }
  };

  const CustomToolbar = ({ date, onNavigate, label }: any) => {
    const handleNavigation = (action: string) => {
      try {
        onNavigate(action);
        
        let newDate = new Date(date);
        if (action === 'NEXT') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (action === 'PREV') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (action === 'TODAY') {
          newDate = new Date();
        }
        setCurrentDate(newDate);
        
        // Update current month for query
        const newMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        setCurrentMonth(newMonth);
        
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 p-2 sm:p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-xl shadow-md gap-2 sm:gap-0 border-2 border-orange-100">
        <div className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent order-1 sm:order-1">{label}</div>
        <div className="flex space-x-1 sm:space-x-2 order-2 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('PREV')}
            className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:cursor-pointer text-xs sm:text-sm px-2 sm:px-3 border-2 border-gray-200 hover:border-orange-300 transition-all duration-300"
          >
            <span className="hidden sm:inline">← Previous</span>
            <span className="sm:hidden">← Prev</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('TODAY')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white hover:cursor-pointer text-xs sm:text-sm px-2 sm:px-3 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('NEXT')}
            className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:cursor-pointer text-xs sm:text-sm px-2 sm:px-3 border-2 border-gray-200 hover:border-orange-300 transition-all duration-300"
          >
            <span className="hidden sm:inline">Next →</span>
            <span className="sm:hidden">Next →</span>
          </Button>
        </div>
      </div>
    );
  };

  const EventComponent = ({ event }: { event: BookingEvent }) => {
    if (event.status === 'skeleton') {
      return (
        <div className="text-xs h-full overflow-hidden p-1 bg-gray-200 rounded animate-pulse">
        </div>
      );
    }
    
    if (event.status === 'overflow') {
      return (
        <div 
          className="text-xs h-full overflow-hidden p-0.5 sm:p-1 text-white cursor-pointer"
          style={{ fontSize: '10px' }}
        >
          <div className="font-bold text-center leading-tight">
            {event.title}
          </div>
          <div className="text-center text-xs">
            Click to see all
          </div>
        </div>
      );
    }

    return (
      <div 
        className="text-xs h-full overflow-hidden p-0.5 sm:p-1 text-white cursor-pointer" 
        style={{ fontSize: '10px' }}
      >
        <div className="font-bold leading-tight">
          <span className="hidden sm:inline">
            {format(event.start, 'H:mm')} - {format(event.end, 'H:mm')} 
          </span>
          <span className="sm:hidden">
            {format(event.start, 'H:mm')}
          </span>
          <div className="truncate">{event.title}</div>
        </div>
        <div className="truncate opacity-90">
          {event.roomId}
          <span className="hidden sm:inline">, {event.bookedBy}</span>
        </div>
        <div className="opacity-90">
          <span className="sm:hidden">
            {event.bookingType === 'full' ? 'Full' : `${event.participants}p`}
          </span>
          <span className="hidden sm:inline">
            {event.bookingType === 'full' ? (
              event.roomCapacity === 0 ? (
                `Full Space (${event.participants} people)`
              ) : (
                `Full Room (${event.roomCapacity} seats)`
              )
            ) : (
              `Partial (${event.participants}/${event.roomCapacity} seats)`
            )}
          </span>
        </div>
      </div>
    );
  };

  const safeFormat = (date: Date, formatStr: string) => {
    try {
      if (!date || isNaN(date.getTime())) return 'Invalid';
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid';
    }
  };

  const handleSelectEvent = (event: BookingEvent) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!isSignedIn) {
      alert("Please sign in to book a laboratory");
      return;
    }
    
    form.setValue('start', start);
    form.setValue('end', end);
    setIsBookingModalOpen(true);
  };

  if (!isMounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 relative overflow-hidden pt-16 sm:pt-20">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
        </div>

        <Head>
          <title>Laboratory Booking Calendar</title>
          <meta name="description" content="Book laboratory rooms for your classes and events" />
        </Head>
        
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 relative z-10">
          <div className="mb-6 animate-fadeInUp">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">Laboratory Booking Calendar</h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">View and book available laboratory time slots</p>
              </div>
            </div>
          </div>
          
          <div>
            <div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-orange-100 p-3 sm:p-4">
                <div className="h-[950px] animate-pulse">
                  <div className="flex justify-between items-center mb-6">
                    <div className="h-8 bg-gray-200 rounded w-48"></div>
                    <div className="flex gap-2">
                      <div className="h-10 bg-gray-200 rounded w-24"></div>
                      <div className="h-10 bg-gray-200 rounded w-20"></div>
                      <div className="h-10 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="h-6 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[...Array(35)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-100 rounded border border-gray-200"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 relative overflow-hidden pt-16 sm:pt-20">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
        </div>

        <Head>
          <title>Laboratory Booking Calendar</title>
          <meta name="description" content="Book laboratory rooms for your classes and events" />
        </Head>
        
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 relative z-10">
        {/* Header Section */}
        <div className="mb-6 animate-fadeInUp">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 bg-clip-text text-transparent drop-shadow-sm leading-tight pb-1">Laboratory Booking Calendar</h1>
              <p className="text-gray-600 mt-2 sm:mt-3 text-sm sm:text-base">View and book available laboratory time slots</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-white/80 backdrop-blur-sm border-2 border-orange-200 text-gray-700 hover:bg-orange-50 hover:border-orange-300 hover:cursor-pointer relative shadow-lg transition-all duration-300"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter Rooms
                    {selectedRoomFilters.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs px-1.5 py-0.5 shadow-md"
                      >
                        {selectedRoomFilters.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Filter by Laboratory</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilterPopover(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-xs hover:cursor-pointer"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  {isLoadingLabs ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center space-x-3 animate-pulse">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      {/* Student Labs Section */}
                      {studentLabs.length > 0 && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Student Labs</h5>
                          </div>
                          {studentLabs.map((room) => {
                            const color = roomColors[room.id];
                            
                            return (
                              <div key={room.id} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`filter-${room.id}`}
                                  checked={selectedRoomFilters.includes(room.id)}
                                  onCheckedChange={(checked) => 
                                    handleRoomFilterChange(room.id, checked as boolean)
                                  }
                                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 hover:cursor-pointer"
                                />
                                <div className="flex items-center space-x-2 flex-1">
                                  <span 
                                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0" 
                                    style={{ backgroundColor: color }}
                                  />
                                  <label 
                                    htmlFor={`filter-${room.id}`}
                                    className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                                  >
                                    {room.name}
                                  </label>
                                  <span className="text-xs text-gray-500">
                                    {room.capacity === 0 ? "Flex" : room.capacity}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Divider */}
                      {studentLabs.length > 0 && staffRooms.length > 0 && (
                        <div className="border-t border-gray-200 my-2"></div>
                      )}
                      
                      {/* Staff Rooms Section */}
                      {staffRooms.length > 0 && (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <h5 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Staff Rooms</h5>
                          </div>
                          {staffRooms.map((room) => {
                            const color = roomColors[room.id];
                            
                            return (
                              <div key={room.id} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`filter-${room.id}`}
                                  checked={selectedRoomFilters.includes(room.id)}
                                  onCheckedChange={(checked) => 
                                    handleRoomFilterChange(room.id, checked as boolean)
                                  }
                                  className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 hover:cursor-pointer"
                                />
                                <div className="flex items-center space-x-2 flex-1">
                                  <span 
                                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0" 
                                    style={{ backgroundColor: color }}
                                  />
                                  <label 
                                    htmlFor={`filter-${room.id}`}
                                    className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                                  >
                                    {room.name}
                                  </label>
                                  <span className="text-xs text-gray-500">
                                    {room.capacity === 0 ? "Flex" : room.capacity}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedRoomFilters.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="text-xs text-gray-600 mb-2">
                        Showing {selectedRoomFilters.length} of {rooms.length} laboratories:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedRoomFilters.map(roomId => {
                          const room = rooms.find(r => r.id === roomId);
                          const color = roomColors[roomId] || '#3B82F6';
                          return (
                            <Badge 
                              key={roomId} 
                              variant="secondary" 
                              className="text-xs"
                              style={{ 
                                backgroundColor: `${color}20`,
                                color: color,
                                border: `1px solid ${color}40`
                              }}
                            >
                              {room?.id || roomId}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              {selectedRoomFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-orange-600 hover:bg-orange-50 hover:text-orange-700 text-xs hover:cursor-pointer transition-all duration-300 border border-transparent hover:border-orange-200"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div>
          {/* Calendar Section */}
          <div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-orange-100 p-3 sm:p-4 hover:shadow-3xl transition-shadow duration-300">
                <div className="h-[950px]">
                  {bookingsError ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <p className="text-red-500 text-sm text-center">Error loading bookings: {bookingsError.message}</p>
                  </div>
                ) : (
                  <Calendar
                    localizer={localizer}
                    events={isLoadingBookings ? generateSkeletonEvents() : limitEventsPerDay(events, 1)}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "100%" }}
                    views={{
                      month: true,
                      week: true,
                      day: true
                    }}
                    defaultView={Views.MONTH}
                    toolbar={true}
                    step={60}
                    timeslots={1}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={(event) => {
                      if (event.status === 'skeleton') {
                        return; // Don't handle skeleton clicks
                      }
                      if (event.status === 'overflow') {
                        const dateKey = event.id.replace('more-', '');
                        handleMoreEventsClick(dateKey);
                      } else {
                        handleSelectEvent(event);
                      }
                    }}
                    eventPropGetter={eventStyleGetter}
                    components={{
                      event: EventComponent,
                      toolbar: CustomToolbar,
                    }}
                    dayLayoutAlgorithm="no-overlap"
                    popup={false}
                    showMultiDayTimes={false}
                    min={new Date(0, 0, 0, 7, 0)}
                    max={new Date(0, 0, 0, 21, 0)}
                    onNavigate={(date, view) => {
                      setCurrentDate(date);
                    }}
                    date={currentDate}
                    culture="en-US"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col bg-white border border-gray-200 shadow-xl">
          <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-3">
                {/* <div 
                  className="w-1 h-8 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: selectedEvent ? roomColors[selectedEvent.roomId] || '#3174ad' : '#3174ad' }}
                /> */}
              {selectedEvent?.title || 'Event Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-4 py-4">
                {selectedEvent.status && selectedEvent.status !== 'overflow' && (
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedEvent.status.toLowerCase() === 'confirmed' || selectedEvent.status.toLowerCase() === 'accepted' || selectedEvent.status.toLowerCase() === 'approved'
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : selectedEvent.status.toLowerCase() === 'pending'
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        : selectedEvent.status.toLowerCase() === 'completed'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        selectedEvent.status.toLowerCase() === 'confirmed' || selectedEvent.status.toLowerCase() === 'accepted' || selectedEvent.status.toLowerCase() === 'approved'
                          ? 'bg-green-500' 
                          : selectedEvent.status.toLowerCase() === 'pending'
                          ? 'bg-yellow-500'
                          : selectedEvent.status.toLowerCase() === 'completed'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      }`}></div>
                      {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                    </span>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Date</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {safeFormat(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Time</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {safeFormat(selectedEvent.start, 'HH:mm')} - {safeFormat(selectedEvent.end, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Laboratory</h4>
                        <p className="text-sm font-medium text-gray-700">{selectedEvent.roomId}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {rooms.find(r => r.id === selectedEvent.roomId)?.name || 'Room details not found'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Booking Type</h4>
                        <div className="mt-1.5">
                          {selectedEvent.bookingType === 'full' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></div>
                              Full {selectedEvent.roomCapacity === 0 ? 'Space' : 'Room'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></div>
                              Partial Booking
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {selectedEvent.participants} participant{selectedEvent.participants !== 1 ? 's' : ''}
                          {selectedEvent.roomCapacity && selectedEvent.roomCapacity > 0 && (
                            ` of ${selectedEvent.roomCapacity} capacity`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">Booked By</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedEvent.bookedBy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-100 bg-white -mx-6 -mb-6 px-6 py-4">
            <Button 
              onClick={() => setIsDetailsModalOpen(false)}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white transition-all shadow-lg hover:shadow-xl hover:cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoreEventsModal} onOpenChange={setShowMoreEventsModal}>
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col bg-white border-2 border-orange-100">
          <DialogHeader className="flex-shrink-0 pb-4 border-b border-orange-100">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-md"></div>
              Events on {moreEventsData?.date && format(moreEventsData.date, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {moreEventsData?.events.length} event{moreEventsData?.events.length !== 1 ? 's' : ''} scheduled
            </p>
          </DialogHeader>
          
          {moreEventsData && (
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-3 py-4">
                {moreEventsData.events.map((event, index) => (
                  <Card 
                    key={event.id} 
                    className="group relative overflow-hidden border-2 border-orange-100 hover:border-orange-300 transition-all duration-300 cursor-pointer bg-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      setTimeout(() => {
                        setSelectedEvent(event);
                        setIsDetailsModalOpen(true);
                      }, 100);
                    }}
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: roomColors[event.roomId] || '#3B82F6' }}
                    />
                    
                    <div className="p-4 pl-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {event.title}
                            </h4>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                              {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-sm flex-shrink-0" 
                                style={{ backgroundColor: roomColors[event.roomId] || '#3B82F6' }}
                              />
                              <span className="font-medium">{event.roomId}</span>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-gray-400">•</span>
                              <span className="truncate">{event.bookedBy}</span>
                            </div>
                          </div>
                          
                          {event.description && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {event.bookingType === 'full' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-1.5"></div>
                                Full {event.roomCapacity === 0 ? 'Space' : 'Room'}
                                <span className="ml-1 text-orange-600">• {event.participants} people</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></div>
                                Partial • {event.participants}/{event.roomCapacity} seats
                              </span>
                            )}
                            
                            {event.status && event.status !== 'overflow' && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                event.status.toLowerCase() === 'accepted' 
                                  ? 'bg-green-100 text-green-800'
                                  : event.status.toLowerCase() === 'completed' 
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  event.status.toLowerCase() === 'accepted' 
                                    ? 'bg-green-400'
                                    : 'bg-yellow-400'
                                }`}></div>
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 ml-4">
                          <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 -mx-6 -mb-6 px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
              </div>
              <Button 
                variant="outline"
                onClick={() => setShowMoreEventsModal(false)}
                className="hover:bg-white hover:border-orange-300 transition-colors hover:cursor-pointer border-2 border-orange-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}