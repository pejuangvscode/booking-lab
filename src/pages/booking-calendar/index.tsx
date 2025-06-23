export default function BookingCalendar() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Booking Calendar</h1>
    </div>
  );
}

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/router';
// import { useAuth } from '@clerk/nextjs';
// import { format, parse, addDays } from 'date-fns';
// import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
// import 'react-big-calendar/lib/css/react-big-calendar.css';
// import { enUS } from 'date-fns/locale';
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "~/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "~/components/ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "~/components/ui/select";
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "~/components/ui/form";
// import { Button } from "~/components/ui/button";
// import { Input } from "~/components/ui/input";
// import { Loader2 } from "lucide-react";
// import { api } from "~/utils/api";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm } from "react-hook-form";
// import * as z from "zod";
// import Head from 'next/head';

// // Date localizer for the calendar
// const locales = {
//   'en-US': enUS,
// };

// const localizer = dateFnsLocalizer({
//   format,
//   parse,
//   startOfWeek: () => addDays(new Date(), 0), // Start week on Sunday
//   getDay: (date) => date.getDay(),
//   locales,
// });

// // Booking form schema
// const bookingFormSchema = z.object({
//   roomId: z.string().min(1, { message: "Please select a room" }),
//   title: z.string().min(3, { message: "Event title must be at least 3 characters" }),
//   description: z.string().optional(),
//   start: z.date(),
//   end: z.date(),
// });

// // Event colors by lab room
// const roomColors = {
//   "B339": "#3174ad",
//   "B357": "#16a34a",
//   "B355": "#ea580c",
//   "C403LIB": "#9333ea",
//   "C402LIB": "#f59e0b",
//   "C401LIB": "#06b6d4",
// };

// // Define event type
// type BookingEvent = {
//   id: string;
//   title: string;
//   start: Date;
//   end: Date;
//   roomId: string;
//   bookedBy: string;
//   description?: string;
// };

// export default function BookingCalendar() {
//   const { isLoaded, isSignedIn, userId } = useAuth();
//   const router = useRouter();
//   const [isMounted, setIsMounted] = useState(false);
//   const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
//   // Form for booking
//   const form = useForm({
//     resolver: zodResolver(bookingFormSchema),
//     defaultValues: {
//       roomId: "",
//       title: "",
//       description: "",
//       start: new Date(),
//       end: new Date(),
//     }
//   });
  
//   // Available laboratory rooms
//   const [rooms] = useState([
//     { id: "B339", name: "B339", capacity: 40 },
//     { id: "B357", name: "B357", capacity: 40 },
//     { id: "B355", name: "B355", capacity: 30 },
//     { id: "C403LIB", name: "C403LIB", capacity: 35 },
//     { id: "C402LIB", name: "C402LIB", capacity: 35 },
//     { id: "C401LIB", name: "C401LIB", capacity: 25 },
//   ]);
  
//   // Mock events data - replace with actual API call
//   const [events, setEvents] = useState<BookingEvent[]>([
//     {
//       id: "1",
//       title: "Algorithm Class",
//       start: new Date(2025, 5, 20, 10, 0),
//       end: new Date(2025, 5, 20, 12, 0),
//       roomId: "C403LIB",
//       bookedBy: "John Smith",
//     },
//     {
//       id: "2",
//       title: "Web Programming",
//       start: new Date(2025, 5, 20, 13, 0),
//       end: new Date(2025, 5, 20, 15, 0),
//       roomId: "B339",
//       bookedBy: "Jane Doe",
//     },
//     {
//       id: "3",
//       title: "Department Meeting",
//       start: new Date(2025, 5, 21, 9, 0),
//       end: new Date(2025, 5, 21, 10, 30),
//       roomId: "B357",
//       bookedBy: "David Chen",
//     },
//     {
//       id: "4",
//       title: "Final Project Workshop",
//       start: new Date(2025, 5, 20, 10, 0),
//       end: new Date(2025, 5, 20, 12, 0),
//       roomId: "B357",
//       bookedBy: "Maria Garcia",
//     },
//   ]);

//   // Set isMounted to true when component mounts on client
//   useEffect(() => {
//     setIsMounted(true);
//   }, []);

//   // Event style getter to color events by room
//   const eventStyleGetter = (event: BookingEvent) => {
//     return {
//       style: {
//         backgroundColor: roomColors[event.roomId] || '#3174ad',
//         color: 'white',
//         borderRadius: '4px',
//         border: 'none',
//       }
//     };
//   };

//   // Custom event component to show both event name and booker
//   const EventComponent = ({ event }: { event: BookingEvent }) => (
//     <div className="text-xs h-full overflow-hidden p-1">
//       <div className="font-bold truncate">{event.title}</div>
//       <div className="text-xs opacity-90 truncate">{event.roomId}</div>
//       <div className="text-xs opacity-80 truncate">{event.bookedBy}</div>
//     </div>
//   );

//   // Handle slot selection
//   const handleSelectSlot = ({ start, end }) => {
//     if (!isSignedIn) {
//       // If not signed in, prompt to sign in
//       alert("Please sign in to book a laboratory");
//       return;
//     }
    
//     form.setValue('start', start);
//     form.setValue('end', end);
//     setIsBookingModalOpen(true);
//   };

//   // Handle form submission
//   const onSubmit = (data) => {    
//     // Create new event
//     const newEvent = {
//       id: `event-${Date.now()}`,
//       title: data.title,
//       start: data.start,
//       end: data.end,
//       roomId: data.roomId,
//       bookedBy: "You", // This would be the actual user name from Clerk
//       description: data.description,
//     };
    
//     // Add to events
//     setEvents([...events, newEvent]);
    
//     // Close modal and reset form
//     setIsBookingModalOpen(false);
//     form.reset();
//   };

//   // Only render content client-side to avoid hydration mismatch
//   if (!isMounted || !isLoaded) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-8 mt-20">
//       <Head>
//         <title>Laboratory Booking Calendar</title>
//         <meta name="description" content="Book laboratory rooms for your classes and events" />
//       </Head>
      
//       <div className="bg-white rounded-lg shadow-lg overflow-hidden">
//         <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
//           <h2 className="text-3xl font-bold text-white">Laboratory Booking Calendar</h2>
//           <p className="text-blue-100 mt-2">View and book available laboratory time slots</p>
//         </div>
        
//         <div className="p-6">
//           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//             {/* Left Sidebar */}
//             <div className="lg:col-span-1 space-y-4">
//               <Card>
//                 <CardHeader className="pb-3">
//                   <CardTitle>Available Laboratories</CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="mt-2">
//                     <div className="text-sm font-medium mb-2">Room Legend:</div>
//                     <div className="space-y-2">
//                       {rooms.map((room) => (
//                         <div key={room.id} className="flex items-center">
//                           <span 
//                             className="inline-block w-4 h-4 mr-2 rounded-sm" 
//                             style={{ backgroundColor: roomColors[room.id] }}
//                           />
//                           <span className="text-sm">{room.name} ({room.capacity} seats)</span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
              
//               <Card>
//                 <CardHeader className="pb-3">
//                   <CardTitle>Quick Book</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   {isSignedIn ? (
//                     <Button 
//                       className="w-full" 
//                       variant="default"
//                       onClick={() => {
//                         const now = new Date();
//                         const oneHourLater = new Date(now);
//                         oneHourLater.setHours(oneHourLater.getHours() + 1);
//                         handleSelectSlot({ start: now, end: oneHourLater });
//                       }}
//                     >
//                       Book a Laboratory
//                     </Button>
//                   ) : (
//                     <Button 
//                       className="w-full" 
//                       variant="outline"
//                       onClick={() => alert("Please sign in to book a laboratory")}
//                     >
//                       Sign in to Book
//                     </Button>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>
            
//             {/* Calendar */}
//             <div className="lg:col-span-3">
//               <div className="h-[700px]">
//                 <Calendar
//                 localizer={localizer}
//                 events={events}
//                 startAccessor="start"
//                 endAccessor="end"
//                 style={{ height: "100%" }}
//                 views={[Views.MONTH, Views.WEEK, Views.DAY]}
//                 defaultView={Views.WEEK}
//                 step={60}
//                 timeslots={2}
//                 selectable
//                 onSelectSlot={handleSelectSlot}
//                 eventPropGetter={eventStyleGetter}
//                 components={{
//                   event: EventComponent, // Custom event component
//                 }}
//                 dayLayoutAlgorithm="no-overlap" // Stack events vertically
//                 tooltipAccessor={event => `${event.title} - Room: ${event.roomId} - Booked by: ${event.bookedBy}`}
//               />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
      
//       {/* Booking Dialog */}
//       <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
//         <DialogContent className="sm:max-w-[500px]">
//           <DialogHeader>
//             <DialogTitle>Book a Laboratory</DialogTitle>
//             <DialogDescription>
//               Complete this form to book a laboratory room.
//             </DialogDescription>
//           </DialogHeader>
          
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//               <FormField
//                 control={form.control}
//                 name="roomId"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Select Laboratory</FormLabel>
//                     <Select 
//                       onValueChange={field.onChange}
//                       defaultValue={field.value}
//                     >
//                       <FormControl>
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select a laboratory" />
//                         </SelectTrigger>
//                       </FormControl>
//                       <SelectContent>
//                         {rooms.map((room) => (
//                           <SelectItem key={room.id} value={room.id}>
//                             {room.name} ({room.capacity} seats)
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
              
//               <FormField
//                 control={form.control}
//                 name="title"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Event Title</FormLabel>
//                     <FormControl>
//                       <Input {...field} />
//                     </FormControl>
//                     <FormDescription>
//                       A brief title for your booking
//                     </FormDescription>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
              
//               <FormField
//                 control={form.control}
//                 name="description"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Description (Optional)</FormLabel>
//                     <FormControl>
//                       <Input {...field} />
//                     </FormControl>
//                     <FormDescription>
//                       Additional details about your booking
//                     </FormDescription>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
              
//               <div className="grid grid-cols-2 gap-4">
//                 <FormField
//                   control={form.control}
//                   name="start"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>Start Time</FormLabel>
//                       <FormControl>
//                         <Input 
//                           type="datetime-local" 
//                           value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
//                           onChange={(e) => {
//                             const date = new Date(e.target.value);
//                             field.onChange(date);
//                           }}
//                         />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
                
//                 <FormField
//                   control={form.control}
//                   name="end"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>End Time</FormLabel>
//                       <FormControl>
//                         <Input 
//                           type="datetime-local"
//                           value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
//                           onChange={(e) => {
//                             const date = new Date(e.target.value);
//                             field.onChange(date);
//                           }}
//                         />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//               </div>
              
//               <DialogFooter className="pt-4">
//                 <Button 
//                   type="button" 
//                   variant="outline" 
//                   onClick={() => setIsBookingModalOpen(false)}
//                 >
//                   Cancel
//                 </Button>
//                 <Button type="submit">Book Laboratory</Button>
//               </DialogFooter>
//             </form>
//           </Form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }