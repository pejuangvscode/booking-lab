import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "~/utils/api";
import { Alert, AlertDescription } from "~/components/ui/alert";

export default function BookingPage() {
  const router = useRouter();
  const { labId } = router.query;
  
  // Form state
  const [bookingDate, setBookingDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [participants, setParticipants] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [phone, setPhone] = useState("");
  const [requestorName, setRequestorName] = useState("");
  const [requestorNIM, setRequestorNIM] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [faculty, setFaculty] = useState("Faculty of Information & Technology"); // Default faculty

  // Fetch lab details using tRPC query
  const {
    data: labDetail,
    isLoading: isLabLoading,
    error: labError
  } = api.lab.getById.useQuery(
    { id: labId as string },
    { 
      enabled: !!labId,
      retry: 1,
      onError: (error) => {
        console.error("Failed to fetch lab details:", error);
      }
    }
  );

  // Define the booking mutation
  const bookingMutation = api.booking.create.useMutation({
    onSuccess: async () => {
      alert("Booking successful!");
      await router.push("/dashboard");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    }
  });

  // Generate hour/minute options
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  
  const eventTypes = ["Class", "Seminar", "Workshop", "Meeting", "Exam", "Other"];
  const facultyOptions = [
    "Faculty of Information & Technology", 
    "Faculty of Science", 
    "Faculty of Business", 
    "Faculty of Engineering",
    "Faculty of Arts & Design"
  ];

  // Handle form submission with tRPC mutation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = {};
    if (!bookingDate) errors.bookingDate = "Booking date is required";
    if (!startHour || !startMinute) errors.startTime = "Start time is required";
    if (!endHour || !endMinute) errors.endTime = "End time is required";
    if (!participants) errors.participants = "Number of participants is required";
    if (!eventName) errors.eventName = "Event name is required";
    if (!eventType) errors.eventType = "Event type is required";
    if (!phone) errors.phone = "Phone number is required";
    if (!requestorName) errors.requestorName = "Requestor name is required";
    if (!requestorNIM) errors.requestorNIM = "Requestor NIM is required";
    if (!faculty) errors.faculty = "Faculty is required";

    // Check time validity
    const startTimeValue = `${startHour}:${startMinute}`;
    const endTimeValue = `${endHour}:${endMinute}`;
    
    if (startTimeValue >= endTimeValue) {
      errors.endTime = "End time must be after start time";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Create booking data object
    const bookingData = {
        labId: labId as string,          // Changed from roomId to labId to match API expectation
        bookingDate: new Date(bookingDate).toISOString(),
        startTime: startTimeValue,
        endTime: endTimeValue,
        participants: parseInt(participants),
        eventName,
        eventType,
        phone,
        faculty,
        // Include user information
        userData: {
            name: requestorName,
            nim: requestorNIM
        }
    };

    console.log("Submitting booking:", bookingData);
    
    // Execute the mutation
    bookingMutation.mutate(bookingData);
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Book a Lab | UPH Facility Booking</title>
      </Head>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-3xl font-bold text-white">
            {labDetail?.name ? `Book ${labDetail.name}` : "Book Laboratory"}
          </h2>
          {labDetail && (
            <p className="text-blue-100 mt-2">
              {labDetail.type} • {labDetail.capacity} seats • {labDetail.department}
            </p>
          )}
          <div className="mt-2 flex space-x-2">
            {labDetail?.facilityId && (
              <span className="bg-white/20 text-white px-2 py-1 rounded text-sm">
                ID: {labDetail.facilityId}
              </span>
            )}
            <span className="bg-green-500/80 text-white px-2 py-1 rounded text-sm">
              Available
            </span>
          </div>
        </div>

        {isLabLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : labError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load lab details. Please try again or select a different lab.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={() => router.push("/lab-search")}
                variant="outline"
              >
                Return to Lab Search
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Booking Date */}
              <div className="space-y-2">
                <label htmlFor="bookingDate" className="block text-sm font-medium text-gray-700">
                  Booking Date
                </label>
                <Input
                  type="date"
                  id="bookingDate"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={formErrors.bookingDate ? "border-red-500" : ""}
                />
                {formErrors.bookingDate && (
                  <p className="text-red-500 text-xs">{formErrors.bookingDate}</p>
                )}
              </div>

              {/* Time slots */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <div className="flex space-x-2">
                    <Select value={startHour} onValueChange={setStartHour}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={`start-hour-${hour}`} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={startMinute} onValueChange={setStartMinute}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem key={`start-min-${minute}`} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formErrors.startTime && (
                    <p className="text-red-500 text-xs">{formErrors.startTime}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <div className="flex space-x-2">
                    <Select value={endHour} onValueChange={setEndHour}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={`end-hour-${hour}`} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={endMinute} onValueChange={setEndMinute}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem key={`end-min-${minute}`} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formErrors.endTime && (
                    <p className="text-red-500 text-xs">{formErrors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Number of participants */}
              <div className="space-y-2">
                <label htmlFor="participants" className="block text-sm font-medium text-gray-700">
                  Number of participants
                </label>
                <Input
                  type="number"
                  id="participants"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  min="1"
                  max={labDetail?.capacity || 999}
                  className={formErrors.participants ? "border-red-500" : ""}
                />
                {formErrors.participants && (
                  <p className="text-red-500 text-xs">{formErrors.participants}</p>
                )}
              </div>

              {/* Event Name/Purpose */}
              <div className="space-y-2">
                <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">
                  Event Name/Purpose
                </label>
                <Input
                  type="text"
                  id="eventName"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="E.g., Algorithm Class, Department Meeting"
                  className={formErrors.eventName ? "border-red-500" : ""}
                />
                {formErrors.eventName && (
                  <p className="text-red-500 text-xs">{formErrors.eventName}</p>
                )}
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className={formErrors.eventType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.eventType && (
                  <p className="text-red-500 text-xs">{formErrors.eventType}</p>
                )}
              </div>

              {/* Faculty */}
              <div className="space-y-2">
                <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                  Faculty
                </label>
                <Select value={faculty} onValueChange={setFaculty}>
                  <SelectTrigger className={formErrors.faculty ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.faculty && (
                  <p className="text-red-500 text-xs">{formErrors.faculty}</p>
                )}
              </div>

              {/* Requestor Phone */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Requestor Phone
                </label>
                <Input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="E.g., 081234567890"
                  className={formErrors.phone ? "border-red-500" : ""}
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-xs">{formErrors.phone}</p>
                )}
              </div>

              {/* Requestor Name */}
              <div className="space-y-2">
                <label htmlFor="requestorName" className="block text-sm font-medium text-gray-700">
                  Requestor Name
                </label>
                <Input
                  type="text"
                  id="requestorName"
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value)}
                  placeholder="Your full name"
                  className={formErrors.requestorName ? "border-red-500" : ""}
                />
                {formErrors.requestorName && (
                  <p className="text-red-500 text-xs">{formErrors.requestorName}</p>
                )}
              </div>

              {/* Requestor NIM */}
              <div className="space-y-2">
                <label htmlFor="requestorNIM" className="block text-sm font-medium text-gray-700">
                  Requestor NIM
                </label>
                <Input
                  type="text"
                  id="requestorNIM"
                  value={requestorNIM}
                  onChange={(e) => setRequestorNIM(e.target.value)}
                  placeholder="Your student ID number"
                  className={formErrors.requestorNIM ? "border-red-500" : ""}
                />
                {formErrors.requestorNIM && (
                  <p className="text-red-500 text-xs">{formErrors.requestorNIM}</p>
                )}
              </div>
            </div>

            {/* Note Message */}
            <div className="bg-gray-100 p-4 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700">Note</h4>
              <p className="text-sm text-gray-600 mt-1">
                Booking Request is subject to approval by the lab administrator. Please ensure all details are correct before submitting.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button 
                type="submit" 
                className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-lg"
                disabled={bookingMutation.isLoading}
              >
                {bookingMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm booking"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}