import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { Switch } from '~/components/ui/switch';
import { is } from 'date-fns/locale';
import { AlertTriangle, Building, Calendar, Loader2, Users } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useCustomDialog } from "~/hooks/useCustomDialog";
import { api } from "~/utils/api";
import { Checkbox } from '~/components/ui/checkbox';

export default function BookingPage() {
  const router = useRouter();
  const { labId } = router.query;
  
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { dialogState, closeDialog, confirm, success, error, alert } = useCustomDialog();

  const utils = api.useUtils();
  
  const [bookingDate, setBookingDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [bookingType, setBookingType] = useState("partial");
  const [participants, setParticipants] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [phone, setPhone] = useState("");
  const [requestorName, setRequestorName] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [faculty, setFaculty] = useState("Faculty of Information & Technology");
  const [checking, setChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultipleBooking, setIsMultipleBooking] = useState(false);
  const [classId, setClassId] = useState("");

  const [endDate, setEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [previewBookings, setPreviewBookings] = useState<Array<{
    date: string;
    dayName: string;
    conflicts?: boolean;
  }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const daysOfWeek = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
  ];

  const {
    data: labDetail,
    isLoading: isLabLoading,
    error: labError
  } = api.lab.getById.useQuery(
    { id: labId as string },
    { 
      enabled: !!labId,
      retry: 1
    }
  );

  const multipleBookingMutation = api.booking.createMultiple.useMutation({
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: async (data) => {
      setIsSubmitting(false);
      const { successful, failed } = data;
      
      if (failed.length === 0) {
        await success(`Successfully created ${successful.length} bookings! Redirecting to dashboard...`, "Multiple Booking Success");
      } else {
        await alert(
          `Created ${successful.length} bookings successfully. ${failed.length} bookings failed: ${failed.map(f => f.date).join(', ')}`,
          "Partial Success"
        );
      }
      await router.push("/admin/dashboard");
    },
    onError: async (err) => {
      setIsSubmitting(false);
      await error(`Failed to create multiple bookings: ${err.message}`, "Multiple Booking Error");
    }
  });

  const bookingMutation = api.booking.create.useMutation({
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: async () => {
      setIsSubmitting(false);
      await success("Booking successful! Redirecting to dashboard...", "Success");
      await router.push("/admin/dashboard");
    },
    onError: async (err) => {
      setIsSubmitting(false);
      await error(`Failed to create booking: ${err.message}`, "Booking Error");
    }
  });

  useEffect(() => {
    if (isMultipleBooking && bookingDate && endDate && selectedDays.length > 0) {
      generatePreviewBookings();
    } else {
      setPreviewBookings([]);
      setShowPreview(false);
    }
  }, [isMultipleBooking, bookingDate, endDate, selectedDays]);

  const generatePreviewBookings = () => {
    if (!bookingDate || !endDate || selectedDays.length === 0) return;

    const startDateObj = new Date(bookingDate);
    const endDateObj = new Date(endDate);
    const bookings: Array<{ date: string; dayName: string }> = [];

    for (let date = new Date(startDateObj); date <= endDateObj; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        bookings.push({
          date: date.toISOString().split('T')[0] || '',
          dayName: daysOfWeek.find(d => d.value === dayOfWeek)?.label || 'Unknown'
        });
      }
    }

    setPreviewBookings(bookings);
    setShowPreview(bookings.length > 0);
  };

  const handleDayToggle = (dayValue: number) => {
    setSelectedDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const calculateParticipants = () => {
    if (!labDetail) return 0;
    
    if (labDetail.capacity === 0) {
      return parseInt(participants) || 0;
    } else if (bookingType === "full") {
      return labDetail.capacity || parseInt(participants) || 1;
    } else {
      return parseInt(participants) || 1;
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!bookingDate) errors.bookingDate = "Start date is required";
    
    if (isMultipleBooking) {
      if (!endDate) errors.endDate = "End date is required";
      if (selectedDays.length === 0) errors.selectedDays = "Please select at least one day of the week";
      if (bookingDate && endDate && new Date(endDate) <= new Date(bookingDate)) {
        errors.endDate = "End date must be after start date";
      }
    }
    
    if (!startHour || !startMinute) errors.startTime = "Start time is required";
    if (!endHour || !endMinute) errors.endTime = "End time is required";
    if (!eventName) errors.eventName = "Event name is required";
    if (!eventType) errors.eventType = "Event type is required";
    if (!phone) errors.phone = "Phone number is required";
    if (!requestorName) errors.requestorName = "Requestor name is required";
    if (!faculty) errors.faculty = "Faculty is required";

    const startTimeValue = `${startHour}:${startMinute}`;
    const endTimeValue = `${endHour}:${endMinute}`;
    
    if (startTimeValue >= endTimeValue) {
      errors.endTime = "End time must be after start time";
    }

    // Validate participants
    if (labDetail?.capacity === 0) {
      if (participants.trim() === "" || isNaN(parseInt(participants))) {
        errors.participants = "Number of participants is required for flexible space rooms";
      } else if (parseInt(participants) < 0) {
        errors.participants = "Number of participants cannot be negative";
      }
    } else if (bookingType === "partial") {
      if (!participants || participants.trim() === "") {
        errors.participants = "Number of participants is required";
      } else if (parseInt(participants) <= 0 || isNaN(parseInt(participants))) {
        errors.participants = "Number of participants must be a valid number greater than 0";
      } else if (labDetail?.capacity && parseInt(participants) > labDetail.capacity) {
        errors.participants = `Number of participants cannot exceed room capacity (${labDetail.capacity})`;
      }
    }

    return errors;
  }

  
  const handleBookingTypeChange = (value: string) => {
    setBookingType(value);
    if (value === "full") {
      const capacity = labDetail?.capacity || 0;
      if (capacity === 0) {
        setParticipants("0");
      } else {
        setParticipants(capacity.toString());
      }
    } else if (value === "partial") {
      setParticipants("");
    }
    
    if (formErrors.participants) {
      const newErrors = { ...formErrors };
      delete newErrors.participants;
      setFormErrors(newErrors);
    }
  };

  const hourOptions = Array.from({ length: 13 }, (_, i) => (i + 7).toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const eventTypes = ["Class", "Seminar", "Workshop", "Meeting", "Exam", "Other"];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      await alert("Please fix the form errors before submitting.", "Form Validation");
      return;
    }
    
    const finalParticipants = calculateParticipants();
    const startTimeValue = `${startHour}:${startMinute}`;
    const endTimeValue = `${endHour}:${endMinute}`;

    if (isMultipleBooking) {
      const bookingData = {
        labId: labId as string,
        startDate: bookingDate,
        endDate: endDate,
        selectedDays: selectedDays,
        startTime: startTimeValue,
        endTime: endTimeValue,
        participants: finalParticipants,
        eventName,
        eventType,
        phone,
        faculty,
        userData: {
          name: requestorName,
        },
        equipment: classId
      };

      const confirmed = await confirm(
        `Are you sure you want to create ${previewBookings.length} recurring bookings for ${labDetail?.name}?\n\nEvent: ${eventName}\nTime: ${startTimeValue} - ${endTimeValue}\nDays: ${selectedDays.map(d => daysOfWeek.find(day => day.value === d)?.short).join(', ')}\nParticipants: ${finalParticipants}`,
        "Confirm Multiple Bookings"
      );
      
      if (!confirmed) return;
      
      multipleBookingMutation.mutate(bookingData);
    } else {
      setChecking(true);
      try {
        const conflictResult = await utils.client.booking.checkConflicts.query({
          labId: labId as string,
          bookingDate: bookingDate,
          startTime: startTimeValue,
          endTime: endTimeValue,
          participants: finalParticipants,
          bookingType: bookingType as "full" | "partial"
        });
        
        setChecking(false);
        
        if (conflictResult?.hasConflicts) {
          let errorMessage = "";
          
          switch (conflictResult.conflictType) {
            case "FULL_ROOM_CONFLICT":
              errorMessage = conflictResult.message;
              break;
            case "CAPACITY_EXCEEDED":
              const { capacityInfo } = conflictResult;
              if (capacityInfo) {
                errorMessage = `Room capacity exceeded! Room has ${capacityInfo.roomCapacity} seats. Currently booked: ${capacityInfo.currentlyBooked} participants. You requested: ${capacityInfo.requested} participants. Available spots: ${capacityInfo.available}`;
              } else {
                errorMessage = "Room capacity exceeded! (Capacity details unavailable)";
              }
              break;
            default:
              errorMessage = "This room is already booked for the selected time. Please choose a different time or reduce the number of participants.";
          }
          
          await error(errorMessage, "Booking Conflict");
          setFormErrors({ conflict: errorMessage });
          return;
        }
        
        const confirmed = await confirm(
          `Are you sure you want to book ${labDetail?.name} for ${eventName} on ${new Date(bookingDate).toLocaleDateString()} from ${startTimeValue} to ${endTimeValue}${finalParticipants === 0 ? ' (flexible space)' : ` for ${finalParticipants} participant${finalParticipants !== 1 ? 's' : ''}`}?`,
          "Confirm Booking"
        );
        
        if (!confirmed) return;
        
        const bookingData = {
          labId: labId as string,
          bookingDate: new Date(bookingDate).toISOString(),
          startTime: startTimeValue,
          endTime: endTimeValue,
          participants: finalParticipants,
          eventName,
          eventType,
          phone,
          faculty,
          userData: {
            name: requestorName,
            nim: ""
          },
        };
        
        bookingMutation.mutate(bookingData);
        
      } catch (err) {
        setChecking(false);
        console.error("Error checking conflicts:", err);
        await error("Could not check for booking conflicts. Please try again.", "Connection Error");
        setFormErrors({ conflict: "Could not check for booking conflicts. Please try again." });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Book a Lab | UPH Facility Booking</title>
      </Head>
      
      {/* User Info Bar */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-blue-700">
                Signed in as: <span className="font-medium">{user?.firstName} {user?.lastName} (Admin)</span>
              </span>
            </div>
            <span className="text-xs text-blue-600">
              {user?.emailAddresses[0]?.emailAddress}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header section */}
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-3xl font-bold text-white">
            {labDetail?.name ? `Book ${labDetail.name}` : "Book Laboratory"}
          </h2>
          {labDetail && (
            <p className="text-orange-100 mt-2">
              {labDetail.type} • {
                labDetail.capacity && labDetail.capacity > 0 
                  ? `${labDetail.capacity} seats` 
                  : "Flexible space"
              } • {labDetail.department}
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

        {/* Form section */}
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
                onClick={() => router.push("/admin/lab-search")}
                variant="outline"
              >
                Return to Lab Search
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Multiple Booking Toggle */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>Booking Mode</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={isMultipleBooking}
                    onCheckedChange={(checked) => {
                      setIsMultipleBooking(checked);
                      if (!checked) {
                        setEndDate("");
                        setSelectedDays([]);
                        setPreviewBookings([]);
                        setShowPreview(false);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <div>
                    <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                      {isMultipleBooking ? "Multiple Booking (Recurring)" : "Single Booking"}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {isMultipleBooking 
                        ? "Create recurring bookings for specific days of the week over a date range"
                        : "Create a single booking for one specific date"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <label htmlFor="bookingDate" className="block text-sm font-medium text-gray-700">
                  {isMultipleBooking ? "Start Date" : "Booking Date"}
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

              {/* End Date (Multiple Booking Only) */}
              {isMultipleBooking && (
                <div className="space-y-2">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <Input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={bookingDate || new Date().toISOString().split('T')[0]}
                    className={formErrors.endDate ? "border-red-500" : ""}
                  />
                  {formErrors.endDate && (
                    <p className="text-red-500 text-xs">{formErrors.endDate}</p>
                  )}
                </div>
              )}

              {/* Time slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <div className="flex space-x-2">
                    <Select value={startHour} onValueChange={setStartHour}>
                      <SelectTrigger className={`w-full ${formErrors.startTime ? "border-red-500" : ""}`}>
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
                      <SelectTrigger className={`w-full ${formErrors.startTime ? "border-red-500" : ""}`}>
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
            </div>

            {isMultipleBooking && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Days of Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={() => handleDayToggle(day.value)}
                        />
                        <Label 
                          htmlFor={`day-${day.value}`} 
                          className="text-sm cursor-pointer"
                        >
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formErrors.selectedDays && (
                    <p className="text-red-500 text-xs mt-2">{formErrors.selectedDays}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Booking Preview (Multiple Booking Only) */}
            {isMultipleBooking && showPreview && previewBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Booking Preview ({previewBookings.length} bookings)</span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? 'Hide' : 'Show'} Details
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 mb-3">
                      The following bookings will be created:
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {previewBookings.slice(0, 10).map((booking, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <strong>{booking.dayName}</strong> - {new Date(booking.date).toLocaleDateString()}
                        </div>
                      ))}
                      {previewBookings.length > 10 && (
                        <div className="text-xs text-gray-500 italic">
                          ... and {previewBookings.length - 10} more bookings
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Type Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Booking Type
              </label>

              <RadioGroup 
                value={bookingType} 
                onValueChange={handleBookingTypeChange}
                className={`grid gap-4 ${labDetail?.capacity === 0 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="full" 
                    id="full" 
                    disabled={labDetail?.capacity === 0}
                  />
                  <Label htmlFor="full" className="flex-1 cursor-pointer">
                    <Card className={`p-4 border-2 transition-all duration-200 ${
                      bookingType === "full" 
                        ? "border-orange-500 bg-orange-50" 
                        : "border-gray-200 hover:border-gray-300"
                    } ${labDetail?.capacity === 0 ? 'opacity-100' : ''}`}>
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-3">
                          <Building className={`h-5 w-5 ${
                            bookingType === "full" ? "text-orange-600" : "text-gray-400"
                          }`} />
                          <div>
                            <div className="font-medium text-sm">
                              {labDetail?.capacity === 0 ? "Book Entire Space" : "Book Full Room"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {labDetail?.capacity === 0 
                                ? "Flexible space, no capacity limit"
                                : labDetail?.capacity && labDetail.capacity > 0 
                                  ? `${labDetail.capacity} seats` 
                                  : "All available seats"
                              }
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Label>
                </div>

                {/* Partial Room Option */}
                {labDetail?.capacity !== 0 && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial" />
                    <Label htmlFor="partial" className="flex-1 cursor-pointer">
                      <Card className={`p-4 border-2 transition-all duration-200 ${
                        bookingType === "partial" 
                          ? "border-orange-500 bg-orange-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                        <CardContent className="p-0">
                          <div className="flex items-center space-x-3">
                            <Users className={`h-5 w-5 ${
                              bookingType === "partial" ? "text-orange-600" : "text-gray-400"
                            }`} />
                            <div>
                              <div className="font-medium text-sm">Specify Participants</div>
                              <div className="text-xs text-gray-500">
                                Choose number of people
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            {(bookingType === "partial") && (
              <div className="space-y-2">
                <label htmlFor="participants" className="block text-sm font-medium text-gray-700">
                  Number of Participants {labDetail?.capacity === 0 && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="number"
                  id="participants"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  min="1"
                  max={labDetail?.capacity && labDetail.capacity > 0 ? labDetail.capacity : 999}
                  placeholder={
                    labDetail?.capacity === 0
                      ? "Enter number of participants (required)"
                      : labDetail?.capacity && labDetail.capacity > 0 
                        ? `Enter number (max: ${labDetail.capacity})`
                        : "Enter number of participants"
                  }
                  className={formErrors.participants ? "border-red-500" : ""}
                  required={labDetail?.capacity === 0}
                />
                {formErrors.participants && (
                  <p className="text-red-500 text-xs">{formErrors.participants}</p>
                )}
                {labDetail?.capacity && labDetail.capacity > 0 ? (
                  <p className="text-xs text-gray-500">
                    Room capacity: {labDetail.capacity} seats
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    This room has flexible seating arrangements
                  </p>
                )}
              </div>
            )}

            {/* Full Room Confirmation Display - update text for zero capacity */}
            {bookingType === "full" && labDetail && labDetail.capacity !== 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-medium text-orange-800">Full Room Booking</div>
                    <div className="text-sm text-orange-700">
                      You are booking the entire room ({labDetail.capacity} seats)
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Class ID */}
              <div className="space-y-2">
                <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
                  Class ID
                </label>
                <Input
                  type="text"
                  id="classId"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="Enter class ID"
                  className={formErrors.classId ? "border-red-500" : ""}
                />
                {formErrors.classId && (
                  <p className="text-red-500 text-xs">{formErrors.classId}</p>
                )}
              </div>

              {/* Faculty */}
              <div className="space-y-2">
                <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                  Faculty
                </label>
                <Input
                  type="text"
                  id="faculty"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="Enter your faculty name"
                  className={formErrors.faculty ? "border-red-500" : ""}
                />
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
                  placeholder="Phone number"
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
            </div>

            {/* Note Message */}
            <div className="bg-gray-100 p-4 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700">Note</h4>
              <p className="text-sm text-gray-600 mt-1">
                Booking Request is subject to approval by the lab administrator. Please ensure all details are correct before submitting.
              </p>
            </div>

            {bookingDate && startHour && startMinute && endHour && endMinute && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  {checking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-700">Checking availability...</span>
                    </>
                  ) : formErrors.startTime ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">Invalid booking time</span>
                    </>
                  ) : formErrors.conflict ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">Time slot not available</span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700">Time slot available</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {formErrors.conflict && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="font-bold">Booking Conflict:</strong>
                    <div className="mt-1 text-sm">{formErrors.conflict}</div>
                    <div className="mt-2 text-xs">
                      <strong>Suggestions:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Try a different time slot</li>
                        <li>Choose a different room</li>
                        {bookingType === "partial" && (
                          <li>Reduce the number of participants</li>
                        )}
                        {bookingType === "full" && (
                          <li>Consider partial booking if you don't need the full room</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Submit Button - Updated */}
            <div className="flex justify-center pt-4">
              <Button 
                type="submit" 
                className="w-full py-4 sm:py-6 bg-blue-600 hover:bg-blue-700 text-base sm:text-lg hover:cursor-pointer"
                disabled={bookingMutation.status === "pending" || multipleBookingMutation.status === "pending" || checking || isSubmitting}
              >
                {(bookingMutation.status === "pending" || multipleBookingMutation.status === "pending" || isSubmitting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking availability...
                  </>
                ) : isMultipleBooking ? (
                  `Create ${previewBookings.length} Recurring Bookings`
                ) : (
                  `Confirm booking ${bookingType === "full" ? "(Full Room)" : ""}`
                )}
              </Button>
            </div>
          </form>
        )}
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
  );
}