import { useAuth } from '@clerk/nextjs';
import { format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useUser } from '@clerk/nextjs';
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { api } from "~/utils/api";
import { startOfWeek, getDay } from 'date-fns';


const locales = {
  'en-US': enUS,
};


const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }), // 0 = Sunday
  getDay, // Import getDay from date-fns directly
  locales,
});

// Booking form schema
const bookingFormSchema = z.object({
  roomId: z.string().min(1, { message: "Please select a room" }),
  title: z.string().min(3, { message: "Event title must be at least 3 characters" }),
  description: z.string().optional(),
  start: z.date(),
  end: z.date(),
});

// Event colors by lab room
// Event colors by lab room to match image style
const roomColors: Record<string, string> = {
  "F205": "#4285F4", // Blue
  "B338": "#3C7A0C", // Green
  "B357": "#5E35B1", // Purple
  "F209": "#F25022", // Red
};

// Update your BookingEvent type to accept both string and number
type BookingEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  roomId: string;
  bookedBy: string;
  description?: string;
  status?: string;
  bookingType?: 'full' | 'partial'; // Tambahkan ini
  participants?: number; // Tambahkan ini
  roomCapacity?: number; // Tambahkan ini untuk context
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
  
  // Form for booking
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
  
  // Available laboratory rooms
  const [rooms] = useState([
    { id: "F205", name: "FIT Showcase Lab", capacity: 0 },
    { id: "B338", name: "Informatics Studio", capacity: 20 },
    { id: "B357", name: "Information System Lab", capacity: 20 },
    { id: "F209", name: "Lab F209", capacity: 30 },
  ]);

  // Fetch events using tRPC
  const { 
    data: bookingsData, 
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch: refetchBookings
  } = api.booking.getAllBookings.useQuery(undefined, {
    enabled: isMounted,
    refetchOnWindowFocus: false
  });

  // Update the limitEventsPerDay function to sort by start time and filter cancelled events
  const limitEventsPerDay = (events: BookingEvent[], limit: number = 2) => {
    // First, filter out cancelled events
    const activeEvents = events.filter(event => 
      event.status?.toLowerCase() !== 'cancelled'
    );

    const eventsByDate: Record<string, BookingEvent[]> = {};
    
    // Group active events by date (yyyy-mm-dd format)
    activeEvents.forEach(event => {
      const dateKey = format(event.start, 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });
    
    // Create limited events with "+X more" indicators
    const limitedEvents: BookingEvent[] = [];
    
    Object.entries(eventsByDate).forEach(([dateKey, dayEvents]) => {
      // Sort events by start time (ascending order - earliest first)
      const sortedEvents = dayEvents.sort((a, b) => {
        const timeA = a.start.getTime();
        const timeB = b.start.getTime();
        return timeA - timeB;
      });
      
      // Take only the first 'limit' events (earliest events)
      const visibleEvents = sortedEvents.slice(0, limit);
      limitedEvents.push(...visibleEvents);
      
      // If there are more events, create a "+X more" event
      if (sortedEvents.length > limit) {
        const overflowCount = sortedEvents.length - limit;
        const lastVisibleEvent = visibleEvents[visibleEvents.length - 1];
        
        if (lastVisibleEvent) {
          // Create a special "+X more" event positioned after the last visible event
          const moreEvent: BookingEvent = {
            id: `more-${dateKey}`,
            title: `+${overflowCount} more`,
            start: new Date(lastVisibleEvent.end.getTime()), // Start right after last visible event
            end: new Date(lastVisibleEvent.end.getTime() + 30 * 60 * 1000), // 30 minutes duration
            roomId: 'MORE',
            bookedBy: '',
            description: `${overflowCount} additional events on this date`,
            status: 'overflow',
            bookingType: 'partial',
            participants: overflowCount,
            roomCapacity: 0,
          };
          limitedEvents.push(moreEvent);
        }
      }
    });
    
    return limitedEvents;
  };

  // Transform API bookings to calendar events
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
      enabled: false, // Don't run until explicitly asked to
    }
  );
  
  // Update your useEffect for transforming events
  useEffect(() => {
    if (bookingsData && rooms.length > 0) {      
      const transformedEvents = bookingsData
        .filter(booking => 
          // Filter out cancelled bookings at the source
          booking.status?.toLowerCase() !== 'cancelled'
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

          // Determine booking type based on participants vs room capacity
          let bookingType: 'full' | 'partial' = 'partial';
          if (roomCapacity === 0) {
            bookingType = 'full'; // Flexible space rooms
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
  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Event style getter to color events by room
  const eventStyleGetter = (event: BookingEvent) => {
    // Handle "+X more" events dengan style khusus
    if (event.status === 'overflow') {
      return {
        style: {
          backgroundColor: '#6b7280', // Gray color
          color: 'white',
          borderRadius: '4px',
          border: '1px solid #9ca3af',
          fontStyle: 'italic',
          textAlign: 'center' as const,
        }
      };
    }

    const baseStyle = {
      backgroundColor: (roomColors as Record<string, string>)[event.roomId] || '#3174ad',
      color: 'white',
      borderRadius: '4px',
      border: 'none',
    };

    return { style: baseStyle };
  };

  const handleMoreEventsClick = (dateKey: string) => {
    const allEventsForDate = events
      .filter(e => {
        const eventDateKey = format(e.start, 'yyyy-MM-dd');
        return eventDateKey === dateKey;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime()); // Sort by start time

    setMoreEventsData({
      date: new Date(dateKey + 'T12:00:00'),
      events: allEventsForDate
    });
    setShowMoreEventsModal(true);
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
        
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 p-2 sm:p-4 bg-gray-50 rounded-lg gap-2 sm:gap-0">
        <div className="text-lg sm:text-2xl font-bold text-gray-800 order-1 sm:order-1">{label}</div>
        <div className="flex space-x-1 sm:space-x-2 order-2 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('PREV')}
            className="hover:bg-gray-100 hover:cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
          >
            <span className="hidden sm:inline">← Previous</span>
            <span className="sm:hidden">← Prev</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('TODAY')}
            className="hover:bg-gray-100 hover:cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('NEXT')}
            className="hover:bg-gray-100 hover:cursor-pointer text-xs sm:text-sm px-2 sm:px-3"
          >
            <span className="hidden sm:inline">Next →</span>
            <span className="sm:hidden">Next →</span>
          </Button>
        </div>
      </div>
    );
  };

  const EventComponent = ({ event }: { event: BookingEvent }) => {
    if (event.status === 'overflow') {
      return (
        <div 
          className="text-xs h-full overflow-hidden p-0.5 sm:p-1 text-white cursor-pointer bg-gray-500 rounded border border-gray-400"
          style={{ fontSize: '10px' }}
        >
          <div className="font-bold text-center leading-tight">
            {event.title}
          </div>
          <div className="text-center opacity-90 text-xs">
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

  // Handle event selection
  const handleSelectEvent = (event: BookingEvent) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  // Handle slot selection
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!isSignedIn) {
      // If not signed in, prompt to sign in
      alert("Please sign in to book a laboratory");
      return;
    }
    
    form.setValue('start', start);
    form.setValue('end', end);
    setIsBookingModalOpen(true);
  };

  // Only render content client-side to avoid hydration mismatch
  if (!isMounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-16 sm:mt-20">
      <Head>
        <title>Laboratory Booking Calendar</title>
        <meta name="description" content="Book laboratory rooms for your classes and events" />
      </Head>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden"> 
        <div className="p-3 sm:p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-xl sm:text-3xl font-bold text-white">Laboratory Booking Calendar</h2>
          <p className="text-orange-100 mt-1 sm:mt-2 text-sm sm:text-base">View and book available laboratory time slots</p>
        </div>
        
        <div className="p-3 sm:p-6">
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <Card className="mb-8 lg:mb-0">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base">Available Laboratories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-4">
                  <div className="mt-1 sm:mt-2">
                    <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">Room Legend:</div>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 sm:gap-2">
                      {rooms.map((room) => (
                        <div key={room.id} className="flex items-center">
                          <span 
                            className="inline-block w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 rounded-sm flex-shrink-0" 
                            style={{ backgroundColor: roomColors[room.id] || '#3174ad' }}
                          />
                          <span className="text-xs sm:text-sm truncate">
                            {room.name} 
                            {room.capacity === 0 ? " (Flex)" : ` (${room.capacity})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-2 sm:pt-3 hidden sm:block">
                    <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">Booking Types:</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>• <span className="font-medium text-orange-600">Full</span>: Entire room/space</div>
                      <div>• <span className="font-medium text-blue-600">Partial</span>: Specific number of seats</div>
                      <div>• Numbers show participants/capacity</div>
                      <div>• <span className="font-medium text-gray-500">Cancelled events are hidden</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="h-[950px]">
                {isLoadingBookings ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-orange-600" />
                  </div>
                ) : bookingsError ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <p className="text-red-500 text-sm text-center">Error loading bookings: {bookingsError.message}</p>
                  </div>
                ) : (
                  <Calendar
                    localizer={localizer}
                    events={limitEventsPerDay(events, 1)} // Use updated function
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

      {/* "Show More Events" Modal - events are now sorted by start time */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: selectedEvent ? roomColors[selectedEvent.roomId] || '#3174ad' : '#3174ad' }}
              />
              {selectedEvent?.title || 'Event Details'}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Event information and booking details
            </p>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-6 py-4">
                {/* Event Header Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedEvent.title}
                    </h3>
                    {selectedEvent.status && selectedEvent.status !== 'overflow' && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedEvent.status.toLowerCase() === 'confirmed' || selectedEvent.status.toLowerCase() === 'accepted' || selectedEvent.status.toLowerCase() === 'approved'
                          ? 'bg-green-100 text-green-800' 
                          : selectedEvent.status.toLowerCase() === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : selectedEvent.status.toLowerCase() === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          selectedEvent.status.toLowerCase() === 'confirmed' || selectedEvent.status.toLowerCase() === 'accepted' || selectedEvent.status.toLowerCase() === 'approved'
                            ? 'bg-green-400' 
                            : selectedEvent.status.toLowerCase() === 'pending'
                            ? 'bg-yellow-400'
                            : selectedEvent.status.toLowerCase() === 'completed'
                            ? 'bg-blue-400'
                            : 'bg-gray-400'
                        }`}></div>
                        {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                      </span>
                    )}
                  </div>
                  
                  {selectedEvent.description && (
                    <p className="text-gray-700 text-sm mb-3">
                      {selectedEvent.description}
                    </p>
                  )}
                </div>

                {/* Time & Date Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Date</h4>
                        <p className="text-sm text-gray-600">
                          {safeFormat(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Time</h4>
                        <p className="text-sm text-gray-600">
                          {safeFormat(selectedEvent.start, 'HH:mm')} - {safeFormat(selectedEvent.end, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location & Booking Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Laboratory</h4>
                        <p className="text-sm text-gray-600">{selectedEvent.roomId}</p>
                        <p className="text-xs text-gray-500">
                          {rooms.find(r => r.id === selectedEvent.roomId)?.name || 'Room details not found'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Booking Type</h4>
                        <div className="mt-1">
                          {selectedEvent.bookingType === 'full' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mr-1.5"></div>
                              Full {selectedEvent.roomCapacity === 0 ? 'Space' : 'Room'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></div>
                              Partial Booking
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedEvent.participants} participant{selectedEvent.participants !== 1 ? 's' : ''}
                          {selectedEvent.roomCapacity && selectedEvent.roomCapacity > 0 && (
                            ` of ${selectedEvent.roomCapacity} capacity`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booked By Info */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Booked By</h4>
                      <p className="text-sm text-gray-600">{selectedEvent.bookedBy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                Event details
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoreEventsModal} onOpenChange={setShowMoreEventsModal}>
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Events on {moreEventsData?.date && format(moreEventsData.date, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {moreEventsData?.events.length} event{moreEventsData?.events.length !== 1 ? 's' : ''} scheduled
            </p>
          </DialogHeader>
          
          {moreEventsData && (
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-3 py-4">
                {/* Events are already sorted by start time from handleMoreEventsClick */}
                {moreEventsData.events.map((event, index) => (
                  <Card 
                    key={event.id} 
                    className="group relative overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      setTimeout(() => {
                        setSelectedEvent(event);
                        setIsDetailsModalOpen(true);
                      }, 100);
                    }}
                  >
                    {/* Rest of the card content remains the same */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: roomColors[event.roomId] || '#3174ad' }}
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
                                style={{ backgroundColor: roomColors[event.roomId] || '#3174ad' }}
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
                                event.status.toLowerCase() === 'confirmed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  event.status.toLowerCase() === 'confirmed' 
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
                    
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none" />
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
              </div>
              <Button 
                variant="outline"
                onClick={() => setShowMoreEventsModal(false)}
                className="hover:bg-gray-100 transition-colors hover:cursor-pointer"
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
    </div>
  );
}