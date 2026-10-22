import { useAuth } from '@clerk/nextjs';
import { format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useUser } from '@clerk/nextjs';
import { zodResolver } from "@hookform/resolvers/zod";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Head from 'next/head';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
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
import { StatusPill } from "~/components/status-pill";
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
  return roomType === 'staff_room' ? '#ea580c' : '#2563eb'; // Orange for staff, Blue for students
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
              // title: `+${overflowCount} more`,
              title: `Click to see ${overflowCount} more event${overflowCount > 1 ? 's' : ''}`,
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
          backgroundColor: '#f3f4f6',
          color: 'transparent',
          borderRadius: '8px',
          border: 'none',
          cursor: 'default',
        }
      };
    }

    if (event.status === 'overflow') {
      return {
        style: {
          backgroundColor: 'transparent',
          color: '#4b5563',
          borderRadius: '8px',
          border: 'none',
          textAlign: 'left' as const,
        }
      };
    }

    const color = roomColors[event.roomId] ?? '#2563eb';

    // A light wash of the room-type colour, dark text on top.
    const baseStyle = {
      backgroundColor: `${color}1f`,
      color: '#111827',
      borderRadius: '8px',
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium tracking-tight text-gray-900 sm:text-xl">{label}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('PREV')}
            aria-label="Previous month"
            className="h-8 w-8 border-gray-200 p-0 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('TODAY')}
            className="h-8 border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:cursor-pointer"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('NEXT')}
            aria-label="Next month"
            className="h-8 w-8 border-gray-200 p-0 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const EventComponent = ({ event }: { event: BookingEvent }) => {
    if (event.status === 'skeleton') {
      return <div className="h-4 animate-pulse rounded bg-gray-200" />;
    }

    if (event.status === 'overflow') {
      // `participants` carries the number of hidden events on this day.
      return (
        <div className="cursor-pointer px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline">
          +{event.participants} more
        </div>
      );
    }

    return (
      <div className="h-full cursor-pointer overflow-hidden px-1.5 py-0.5 text-xs leading-snug">
        <div className="tabular-nums text-gray-600">
          <span className="hidden sm:inline">
            {format(event.start, 'H:mm')}&ndash;{format(event.end, 'H:mm')}
          </span>
          <span className="sm:hidden">
            {format(event.start, 'H:mm')}
          </span>
        </div>
        <div className="truncate font-medium text-gray-900">{event.title}</div>
        <div className="hidden truncate text-gray-600 sm:block">
          {event.roomId}
          <span className="ml-1.5 text-gray-500">
            {event.bookingType === 'full' ? (
              event.roomCapacity === 0 ? (
                `${event.participants} people`
              ) : (
                'Full room'
              )
            ) : (
              `${event.participants}/${event.roomCapacity} seats`
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
      <div className="min-h-screen bg-neutral-50">
        <Head>
          <title>Laboratory Booking Calendar</title>
          <meta name="description" content="Book laboratory rooms for your classes and events" />
        </Head>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
            Booking calendar
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Who has which room, and when.
          </p>

          <div aria-hidden="true" className="mt-8 animate-pulse">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-7 w-40 rounded bg-gray-200" />
              <div className="h-8 w-36 rounded bg-gray-200" />
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="h-24 bg-white sm:h-36" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-neutral-50">
        <Head>
          <title>Laboratory Booking Calendar</title>
          <meta name="description" content="Book laboratory rooms for your classes and events" />
        </Head>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
                Booking calendar
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                  Students Lab
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-orange-600" />
                  Staff Room
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:cursor-pointer"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter rooms
                    {selectedRoomFilters.length > 0 && (
                      <span className="ml-2 rounded-md bg-gray-900 px-1.5 text-xs font-medium tabular-nums text-white">
                        {selectedRoomFilters.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                    <h4 className="text-sm font-medium text-gray-900">Show rooms</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-7 px-2 text-xs text-gray-600 hover:cursor-pointer hover:text-gray-900"
                    >
                      Clear all
                    </Button>
                  </div>

                  {isLoadingLabs ? (
                    <div className="space-y-3 p-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex animate-pulse items-center gap-3">
                          <div className="h-4 w-4 rounded bg-gray-200" />
                          <div className="h-4 flex-1 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="max-h-[400px] divide-y divide-gray-100 overflow-y-auto">
                      {studentLabs.length > 0 && (
                        <div className="px-4 py-3">
                          <h5 className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-500">
                            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                            Students Lab
                          </h5>
                          {studentLabs.map((room) => (
                            <div key={room.id} className="flex items-center gap-3 py-1.5">
                              <Checkbox
                                id={`filter-${room.id}`}
                                checked={selectedRoomFilters.includes(room.id)}
                                onCheckedChange={(checked) =>
                                  handleRoomFilterChange(room.id, checked as boolean)
                                }
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 hover:cursor-pointer"
                              />
                              <label
                                htmlFor={`filter-${room.id}`}
                                className="min-w-0 flex-1 cursor-pointer truncate text-sm text-gray-800"
                              >
                                {room.name}
                              </label>
                              <span className="shrink-0 text-xs tabular-nums text-gray-500">
                                {room.capacity === 0 ? "Flexible" : `${room.capacity} seats`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {staffRooms.length > 0 && (
                        <div className="px-4 py-3">
                          <h5 className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-500">
                            <span className="h-2.5 w-2.5 rounded-sm bg-orange-600" />
                            Staff Room
                          </h5>
                          {staffRooms.map((room) => (
                            <div key={room.id} className="flex items-center gap-3 py-1.5">
                              <Checkbox
                                id={`filter-${room.id}`}
                                checked={selectedRoomFilters.includes(room.id)}
                                onCheckedChange={(checked) =>
                                  handleRoomFilterChange(room.id, checked as boolean)
                                }
                                className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 hover:cursor-pointer"
                              />
                              <label
                                htmlFor={`filter-${room.id}`}
                                className="min-w-0 flex-1 cursor-pointer truncate text-sm text-gray-800"
                              >
                                {room.name}
                              </label>
                              <span className="shrink-0 text-xs tabular-nums text-gray-500">
                                {room.capacity === 0 ? "Flexible" : `${room.capacity} seats`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
                    <p className="text-xs text-gray-500">
                      {selectedRoomFilters.length > 0
                        ? `Showing ${selectedRoomFilters.length} of ${rooms.length} rooms`
                        : "Showing all rooms"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilterPopover(false)}
                      className="h-8 border-gray-200 text-gray-700 hover:cursor-pointer hover:bg-gray-50"
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {selectedRoomFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:cursor-pointer"
                >
                  Clear filter
                </Button>
              )}
            </div>
          </header>

          <div className="calendar-minimal mt-8 h-[760px] sm:h-[900px]">
            {bookingsError ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-center text-sm text-red-700">Error loading bookings: {bookingsError.message}</p>
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

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] gap-0 overflow-hidden p-0 sm:max-w-[440px]">
          {selectedEvent && (
            <>
              <DialogHeader className="space-y-0 border-b border-gray-100 px-6 py-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="min-w-0 text-lg font-medium text-gray-900">
                    {selectedEvent.title || 'Event details'}
                  </DialogTitle>
                  {selectedEvent.status && selectedEvent.status !== 'overflow' && (
                    <StatusPill status={selectedEvent.status} className="mt-1 shrink-0" />
                  )}
                </div>
              </DialogHeader>

              <div className="max-h-[60vh] overflow-y-auto px-6">
                <dl className="divide-y divide-gray-100">
                  <div className="flex items-start justify-between gap-6 py-3">
                    <dt className="text-sm text-gray-500">Date</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">
                      {safeFormat(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3">
                    <dt className="text-sm text-gray-500">Time</dt>
                    <dd className="text-right text-sm font-medium tabular-nums text-gray-900">
                      {safeFormat(selectedEvent.start, 'HH:mm')} &ndash; {safeFormat(selectedEvent.end, 'HH:mm')}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3">
                    <dt className="text-sm text-gray-500">Room</dt>
                    <dd className="text-right">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: roomColors[selectedEvent.roomId] ?? '#2563eb' }}
                        />
                        {selectedEvent.roomId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rooms.find((r) => r.id === selectedEvent.roomId)?.name || 'Unknown'}
                      </div>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3">
                    <dt className="text-sm text-gray-500">Booking</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">
                      {selectedEvent.bookingType === 'full'
                        ? `Full ${selectedEvent.roomCapacity === 0 ? 'space' : 'room'}`
                        : 'Partial'}
                      <span className="ml-1 font-normal text-gray-500">
                        {selectedEvent.roomCapacity && selectedEvent.roomCapacity > 0
                          ? `(${selectedEvent.participants}/${selectedEvent.roomCapacity})`
                          : `(${selectedEvent.participants} ${selectedEvent.participants === 1 ? 'person' : 'people'})`}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6 py-3">
                    <dt className="text-sm text-gray-500">Booked by</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">{selectedEvent.bookedBy}</dd>
                  </div>
                  {selectedEvent.description && (
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="text-sm text-gray-500">Event type</dt>
                      <dd className="text-right text-sm font-medium text-gray-900">{selectedEvent.description}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <DialogFooter className="border-t border-gray-100 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:cursor-pointer sm:w-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMoreEventsModal} onOpenChange={setShowMoreEventsModal}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] gap-0 overflow-hidden p-0 sm:max-w-[520px]">
          <DialogHeader className="space-y-1 border-b border-gray-100 px-6 py-5 text-left">
            <DialogTitle className="text-base font-medium text-gray-900">
              {moreEventsData?.date && format(moreEventsData.date, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <p className="text-sm text-gray-500">
              {moreEventsData?.events.length} booking{moreEventsData?.events.length !== 1 ? 's' : ''}
            </p>
          </DialogHeader>

          {moreEventsData && (
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {moreEventsData.events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => {
                      setSelectedEvent(event);
                      setIsDetailsModalOpen(true);
                    }, 100);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 hover:cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">{event.title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-gray-500">
                        {format(event.start, 'HH:mm')}&ndash;{format(event.end, 'HH:mm')}
                      </span>
                    </div>
                    <div className="mt-0.5 flex min-w-0 gap-3 text-xs text-gray-500">
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: roomColors[event.roomId] ?? '#2563eb' }}
                        />
                        {event.roomId}
                      </span>
                      <span className="truncate">{event.bookedBy}</span>
                    </div>
                  </div>
                  {event.status && event.status !== 'overflow' && (
                    <span className="hidden shrink-0 sm:block">
                      <StatusPill status={event.status} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <DialogFooter className="border-t border-gray-100 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setShowMoreEventsModal(false)}
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:cursor-pointer sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
