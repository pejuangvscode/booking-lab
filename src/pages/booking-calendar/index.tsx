import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { format, parse, addDays } from 'date-fns';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale';
import moment from 'moment';
import {  useUser } from '@clerk/nextjs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { api } from "~/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Head from 'next/head';

// Date localizer for the calendar
const locales = {
  'en-US': enUS,
};


const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => addDays(new Date(), 0), // Start week on Sunday
  getDay: (date: Date) => date.getDay(),  // Add the Date type annotation here
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
      const transformedEvents = bookingsData.map(booking => {
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
          room.id === booking.roomId || // Coba dengan roomId
          room.id === booking.room?.facilityId || // Gunakan facilityId, bukan id
          room.name.includes(booking.room?.facilityId || '') // Atau dengan facilityId
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
          roomCapacity: roomCapacity, // Gunakan roomCapacity yang sudah di-match
        };
      }).filter(Boolean);
      
      setEvents(transformedEvents as BookingEvent[]);
    }
  }, [bookingsData, rooms]);
  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Event style getter to color events by room
  const eventStyleGetter = (event: BookingEvent) => {
    const baseStyle = {
      backgroundColor: (roomColors as Record<string, string>)[event.roomId] || '#3174ad',
      color: 'white',
      borderRadius: '4px',
      border: 'none',
    };

    // Apply opacity to cancelled events
    if (event.status?.toLowerCase() === 'cancelled') {
      return {
        style: {
          ...baseStyle,
          opacity: 0.5,
          textDecoration: 'line-through',
        }
      };
    }

    return { style: baseStyle };
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

  const EventComponent = ({ event }: { event: BookingEvent }) => (
    <div 
      className="text-xs h-full overflow-hidden p-0.5 sm:p-1 text-white cursor-pointer" 
      onClick={() => handleSelectEvent(event)}
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
      {/* Mobile: Show simplified info */}
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

  // Handle form submission
  // Fix the onSubmit function
  const onSubmit = async (data: z.infer<typeof bookingFormSchema>) => {
    // Make sure dates are valid
    if (!data.start || !data.end || isNaN(data.start.getTime()) || isNaN(data.end.getTime())) {
      alert("Please select valid dates and times");
      return;
    }
    
    // Format dates properly
    const formattedDate = format(data.start, 'yyyy-MM-dd');
    const startTime = format(data.start, 'HH:mm:ss');
    const endTime = format(data.end, 'HH:mm:ss');
    
    try {
      // Check for conflicts first
      const result = await checkConflictsQuery.refetch();
      
      if (result.data?.hasConflicts) {
        alert("This room is already booked for the selected time. Please choose a different time or room.");
        return;
      }
      
      // Create booking data
      const bookingData = {
        labId: data.roomId,
        bookingDate: formattedDate,
        startTime: startTime,
        endTime: endTime,
        participants: 1,
        eventName: data.title,
        eventType: data.description || 'Not specified',
        phone: '123456789',
        faculty: 'Faculty of Information & Technology',
        userData: {
          name: user?.fullName || 'Current User',
          nim: '12345678'
        }
      };
      
      // Submit booking using the create mutation
      const createBookingMutation = api.booking.create.useMutation({
        onSuccess: () => {
          setIsBookingModalOpen(false);
          form.reset();
          void refetchBookings();
        },
        onError: (error) => {
          alert(`Failed to create booking: ${error.message}`);
        }
      });
      
      createBookingMutation.mutate(bookingData);
    } catch (error) {
      alert(`Failed to check for conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Only render content client-side to avoid hydration mismatch
  if (!isMounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // SINGLE RETURN STATEMENT - Remove the duplicated structure
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
            {/* Sidebar - pada mobile akan ada di atas */}
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
                  
                  {/* Mobile: Collapse this section, Desktop: Show full */}
                  <div className="border-t pt-2 sm:pt-3 hidden sm:block">
                    <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">Booking Types:</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>• <span className="font-medium text-orange-600">Full</span>: Entire room/space</div>
                      <div>• <span className="font-medium text-blue-600">Partial</span>: Specific number of seats</div>
                      <div>• Numbers show participants/capacity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="h-[1200px]">
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
                    events={events}
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
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    components={{
                      event: EventComponent,
                      toolbar: CustomToolbar,
                    }}
                    dayLayoutAlgorithm="no-overlap"
                    popup={true}
                    showMultiDayTimes={false}
                    min={new Date(0, 0, 0, 7, 0)}
                    max={new Date(0, 0, 0, 21, 0)}
                    onNavigate={(date, view) => {
                      setCurrentDate(date);
                    }}
                    date={currentDate}
                    // Perbaikan: Gunakan eventLimit, bukan length
                    showAllEvents={false} // Pastikan false
                    onShowMore={(events, date) => {
                      console.log(`Show ${events.length} more events for date:`, date);
                      // Optional: bisa tambahkan modal untuk show all events
                    }}
                    popupOffset={5} // Offset untuk popup positioning
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Event Details</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-medium">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-500">
                  {format(selectedEvent.start, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              
              {/* Mobile: Stack vertically, Desktop: Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm font-medium">Start Time</p>
                  <p className="text-sm text-gray-600">{format(selectedEvent.start, "h:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">End Time</p>
                  <p className="text-sm text-gray-600">{format(selectedEvent.end, "h:mm a")}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm font-medium">Room</p>
                  <p className="text-sm text-gray-600">{selectedEvent.roomId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Room Capacity</p>
                  <p className="text-sm text-gray-600">
                    {selectedEvent.roomCapacity === 0 ? "Flexible Space" : `${selectedEvent.roomCapacity} seats`}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm font-medium">Booking Type</p>
                  <p className={`text-sm font-semibold ${
                    selectedEvent.bookingType === 'full' ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {selectedEvent.bookingType === 'full' ? 'Full Room/Space' : 'Partial Room'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Participants</p>
                  <p className="text-sm text-gray-600">
                    {selectedEvent.participants} 
                    {selectedEvent.bookingType === 'partial' && (selectedEvent.roomCapacity ?? 0) > 0 && (
                      <span className="text-gray-500"> seat(s)</span>
                    )}
                    {selectedEvent.bookingType === 'full' && (selectedEvent.roomCapacity ?? 0) > 0 && (
                      <span className="text-gray-500"> (Full Room)</span>
                    )}
                    {(selectedEvent.roomCapacity ?? 0) === 0 && (
                      <span className="text-gray-500"> (Flexible Space)</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium">Booked By</p>
                <p className="text-sm text-gray-600 break-words">{selectedEvent.bookedBy}</p>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-gray-600 break-words">{selectedEvent.description}</p>
                </div>
              )}
              
              {selectedEvent.status && (
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className={`text-sm font-semibold ${
                    selectedEvent.status.toLowerCase() === 'cancelled' 
                    ? 'text-red-600' 
                    : selectedEvent.status.toLowerCase() === 'confirmed' 
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                  </p>
                </div>
              )}
              
              <DialogFooter className="pt-3 sm:pt-4">
                <Button 
                  className="w-full sm:w-auto hover:bg-gray-100 hover:cursor-pointer"
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}