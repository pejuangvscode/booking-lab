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
const roomColors = {
  "F205": "#4285F4", // Blue
  "B338": "#3C7A0C", // Green
  "B357": "#5E35B1", // Purple
  "F209": "#F25022", // Red
};

// Define event type
type BookingEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  roomId: string;
  bookedBy: string;
  description?: string;
  status?: string;
};

export default function BookingCalendar() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  
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
      labId: "", // Default empty values
      bookingDate: "",
      startTime: "",
      endTime: ""
    },
    {
      enabled: false, // Don't run until explicitly asked to
    }
  );
  
  useEffect(() => {
    if (bookingsData) {
      console.log("Raw booking data:", bookingsData); // Debug: Check raw data
      
      const transformedEvents = bookingsData.map(booking => {
        // Ensure proper date parsing by handling various date formats
        let startDate, endDate;
        
        try {
          // Handle date + time string combination
          const bookingDateStr = typeof booking.bookingDate === 'object' 
            ? (booking.bookingDate as Date).toISOString().split('T')[0]
            : new Date(String(booking.bookingDate)).toISOString().split('T')[0];
          
          startDate = new Date(`${bookingDateStr}T${booking.startTime}`);
          endDate = new Date(`${bookingDateStr}T${booking.endTime}`);
          
          // Check if dates are valid
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Invalid date detected:", { booking, startDate, endDate });
            // Use current date as fallback
            const today = new Date();
            startDate = today;
            endDate = new Date(today.getTime() + 60*60*1000); // +1 hour
          }
        } catch (error) {
          console.error("Error parsing dates:", error, { booking });
          // Use current date as fallback
          const today = new Date();
          startDate = today;
          endDate = new Date(today.getTime() + 60*60*1000); // +1 hour
        }
        
        return {
          id: String(booking.id), // Convert number to string
          title: booking.eventName || "Unnamed Event",
          start: startDate,
          end: endDate,
          roomId: booking.room?.facilityId || "Unknown",
          bookedBy: booking.requesterName || 
                  (booking.user ? `User ID: ${booking.user.id.substring(0, 6)}...` : "Unknown"),
          description: booking.eventType || "No description",
          status: booking.status || "pending"
        };
      });
      
      console.log("Transformed events:", transformedEvents); // Debug: Check transformed events
      setEvents(transformedEvents);
    }
  }, [bookingsData]);

  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Event style getter to color events by room
  const eventStyleGetter = (event: BookingEvent) => {
    const baseStyle = {
      backgroundColor: roomColors[event.roomId] || '#3174ad',
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

  // Add custom header for the month view
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.date.setMonth(toolbar.date.getMonth() - 1);
      toolbar.onNavigate('prev');
    };

    const goToNext = () => {
      toolbar.date.setMonth(toolbar.date.getMonth() + 1);
      toolbar.onNavigate('next');
    };

    const goToCurrent = () => {
      const now = new Date();
      toolbar.date.setMonth(now.getMonth());
      toolbar.date.setYear(now.getFullYear());
      toolbar.onNavigate('current');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-2xl font-medium">
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-medium">{label()}</div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={goToBack}
          >
            ←
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={goToCurrent}
          >
            today
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded"
            onClick={goToNext}
          >
            →
          </button>
        </div>
      </div>
    );
  };
  // Custom event component to show both event name and booker
  // Custom event component to match the image format
const EventComponent = ({ event }: { event: BookingEvent }) => (
  <div 
    className="text-xs h-full overflow-hidden p-1 text-white" 
    onClick={() => handleSelectEvent(event)}
    style={{ fontSize: '9px' }}
  >
    <div className="font-bold">
      {format(event.start, 'H:mm')} - {format(event.end, 'H:mm')} {event.title}
    </div>
    <div>
      {event.roomId}, Requestor: {event.bookedBy}
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

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Laboratory Booking Calendar</title>
        <meta name="description" content="Book laboratory rooms for your classes and events" />
      </Head>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-3xl font-bold text-white">Laboratory Booking Calendar</h2>
          <p className="text-blue-100 mt-2">View and book available laboratory time slots</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Available Laboratories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-2">Room Legend:</div>
                    <div className="space-y-2">
                      {rooms.map((room) => (
                        <div key={room.id} className="flex items-center">
                          <span 
                            className="inline-block w-4 h-4 mr-2 rounded-sm" 
                            style={{ backgroundColor: roomColors[room.id] }}
                          />
                          <span className="text-sm">{room.name} ({room.capacity} seats)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Quick Book</CardTitle>
                </CardHeader>
                <CardContent>
                  {isSignedIn ? (
                    <Button 
                      className="w-full" 
                      variant="default"
                      onClick={() => {
                        const now = new Date();
                        const oneHourLater = new Date(now);
                        oneHourLater.setHours(oneHourLater.getHours() + 1);
                        handleSelectSlot({ start: now, end: oneHourLater });
                      }}
                    >
                      Book a Laboratory
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => alert("Please sign in to book a laboratory")}
                    >
                      Sign in to Book
                    </Button>
                  )}
                </CardContent>
              </Card> */}
              
              {/* <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Calendar Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <p>• Click on a time slot to book</p>
                    <p>• Click on an event to see details</p>
                    <p>• Navigate views using toolbar</p>
                    <p className="mt-2 font-medium">Color Legend:</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-block w-4 h-4 mr-2 opacity-50" style={{ backgroundColor: '#3174ad' }}></span>
                      <span>Cancelled booking</span>
                    </div>
                  </div>
                </CardContent>
              </Card> */}
            </div>
            
            {/* Calendar */}
            <div className="lg:col-span-3">
              <div className="h-[700px]">
                {isLoadingBookings ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  </div>
                ) : bookingsError ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-red-500">Error loading bookings: {bookingsError.message}</p>
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
                    popup
                    showMultiDayTimes
                    min={new Date(0, 0, 0, 7, 0)} // Start day at 7am
                    max={new Date(0, 0, 0, 21, 0)} // End day at 9pm
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Booking Dialog */}
      {/* <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Book a Laboratory</DialogTitle>
            <DialogDescription>
              Complete this form to book a laboratory room.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Laboratory</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a laboratory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} ({room.capacity} seats)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      A brief title for your booking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Additional details about your booking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local"
                          value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsBookingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Book Laboratory</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog> */}
      
      {/* Event Details Dialog */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-500">
                  {format(selectedEvent.start, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Start Time</p>
                  <p className="text-sm text-gray-600">{format(selectedEvent.start, "h:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">End Time</p>
                  <p className="text-sm text-gray-600">{format(selectedEvent.end, "h:mm a")}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium">Room</p>
                <p className="text-sm text-gray-600">{selectedEvent.roomId}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Booked By</p>
                <p className="text-sm text-gray-600">{selectedEvent.bookedBy}</p>
              </div>
              
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                </div>
              )}
              
              {selectedEvent.status && (
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className={`text-sm ${
                    selectedEvent.status.toLowerCase() === 'cancelled' 
                    ? 'text-red-600' 
                    : selectedEvent.status.toLowerCase() === 'accepted' 
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {selectedEvent.status}
                  </p>
                </div>
              )}
              
              <DialogFooter>
                <Button 
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