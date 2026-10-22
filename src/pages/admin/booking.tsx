import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { Switch } from '~/components/ui/switch';
import { ChevronLeft, Loader2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  AvailabilityStatus,
  ChoiceOption,
  FieldError,
  FieldLabel,
  FormSection,
  TimeField,
} from "~/components/booking-form-parts";
import { Button } from "~/components/ui/button";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup } from "~/components/ui/radio-group";
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
  const [faculty, setFaculty] = useState("Faculty of Artificial Intelligence and Data Science");
  const [checking, setChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultipleBooking, setIsMultipleBooking] = useState(false);

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

  const generateUniqueCode = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `MBK-${timestamp}-${randomStr}`;
  };

  const {
    data: labDetail,
    isLoading: isLabLoading,
    error: labError
  } = api.admin.getAccessibleLabById.useQuery(
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
    onSuccess: async (data) => {
      setIsSubmitting(false);
      if (data.autoApproved) {
        await success("Booking automatically approved! You are a PIC for this lab. Redirecting to dashboard...", "Auto-Approved");
      } else {
        await success("Booking successful! Redirecting to dashboard...", "Success");
      }
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

  useEffect(() => {
    if (labDetail?.capacity === 0) {
      setBookingType("full");
      setParticipants("0");
    }
    else if (labId === "MM16") {
      setBookingType("full");
      setParticipants("14");
    }
    else if (labId === "MH16") {
      setBookingType("full");
      setParticipants("50");
    }
  }, [labDetail, labId]);

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
    if (!phone && labId !== "MM16" && labId !== "MH16") errors.phone = "Phone number is required";
    if (!requestorName) errors.requestorName = "Requestor name is required";
    if (!faculty && labId !== "MM16") errors.faculty = "Faculty is required";

    const startTimeValue = `${startHour}:${startMinute}`;
    const endTimeValue = `${endHour}:${endMinute}`;
    
    if (startTimeValue >= endTimeValue) {
      errors.endTime = "End time must be after start time";
    }

    // Validate participants
    if (labDetail?.capacity === 0 || labId === "MM16" || labId === "MH16") {
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

  const formatLabType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
    
    const finalParticipants = labDetail?.capacity === 0 || labId === "MM16" || labId === "MH16"
      ? parseInt(participants) || 0
      : bookingType === "full" 
        ? (labDetail?.capacity || parseInt(participants) || 1)
        : parseInt(participants) || 1;
    const startTimeValue = `${startHour}:${startMinute}`;
    const endTimeValue = `${endHour}:${endMinute}`;

    if (isMultipleBooking) {
      const uniqueCode = `MBK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
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
        phone: labDetail?.type !== "staff_room" ? phone : "",
        faculty: labDetail?.type !== "staff_room" ? faculty : "",
        userData: {
          name: requestorName,
        },
        equipment: uniqueCode
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
        const uniqueCode = generateUniqueCode();
        const bookingData = {
          labId: labId as string,
          bookingDate: new Date(bookingDate).toISOString(),
          startTime: startTimeValue,
          endTime: endTimeValue,
          participants: finalParticipants,
          eventName,
          eventType,
          phone: labDetail?.type !== "staff_room" ? phone : "",
          faculty: labDetail?.type !== "staff_room" ? faculty : "",
          userData: {
            name: requestorName,
            nim: ""
          },
          equipment: uniqueCode
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
    <div className="min-h-screen bg-neutral-50 px-4 pb-16 pt-24 sm:px-6">
      <Head>
        <title>Book a Lab | UPH Facility Booking</title>
      </Head>

      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/lab-search"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          All rooms
        </Link>

        <header className="mt-4 sm:mt-5">
          <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
            {labDetail?.name ? `Book ${labDetail.name}` : "Book Laboratory"}
          </h1>
          {labDetail && (
            <>
              <p className="mt-1.5 text-sm text-gray-500">{labDetail.department}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-gray-200 py-3 text-sm sm:mt-6 sm:grid-cols-4 sm:gap-x-6 sm:py-4">
                {labDetail.facilityId && (
                  <div>
                    <dt className="text-xs text-gray-500 sm:text-sm">Room ID</dt>
                    <dd className="mt-0.5 font-medium text-gray-900">{labDetail.facilityId}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 sm:text-sm">Type</dt>
                  <dd className="mt-0.5 text-gray-900">{formatLabType(labDetail.type)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 sm:text-sm">Capacity</dt>
                  <dd className="mt-0.5 text-gray-900">
                    {labDetail.capacity && labDetail.capacity > 0
                      ? `${labDetail.capacity} seats`
                      : "Flexible space"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 sm:text-sm">Status</dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex items-center gap-1.5 text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Available
                    </span>
                  </dd>
                </div>
              </dl>
            </>
          )}
        </header>

        <div className="-mx-4 mt-6 overflow-hidden border-y border-gray-200 bg-white sm:mx-0 sm:mt-8 sm:rounded-2xl sm:border">
          {isLabLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : labError ? (
            <div className="p-6 sm:p-8">
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm font-medium text-red-900">
                  Failed to load lab details
                </p>
                <p className="mt-1 text-sm leading-relaxed text-red-800">
                  Please try again, or select a different lab.
                </p>
                <Button
                  onClick={() => router.push("/admin/lab-search")}
                  variant="outline"
                  className="mt-4 border-red-200 bg-white text-red-700 hover:cursor-pointer hover:bg-red-50 hover:text-red-800"
                >
                  Return to lab search
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              <FormSection
                title="Date and time"
                hint={isMultipleBooking ? "The same time slot is booked on every chosen day." : undefined}
              >
                <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-3.5 py-3 sm:px-4 sm:py-3.5">
                  <div>
                    <Label htmlFor="recurring" className="cursor-pointer text-sm font-medium text-gray-900">
                      Repeat weekly
                    </Label>
                    <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                      {isMultipleBooking
                        ? "Recurring bookings on chosen days across a date range."
                        : "Off. One booking on a single date."}
                    </p>
                  </div>
                  <Switch
                    id="recurring"
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
                </div>

                <div className={`grid gap-3 sm:grid-cols-2 sm:gap-5 ${isMultipleBooking ? "grid-cols-2" : ""}`}>
                  <div>
                    <FieldLabel htmlFor="bookingDate">
                      {isMultipleBooking ? "Start date" : "Date"}
                    </FieldLabel>
                    <Input
                      type="date"
                      id="bookingDate"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={formErrors.bookingDate ? "border-red-500 hover:cursor-pointer" : "hover:cursor-pointer"}
                    />
                    <FieldError message={formErrors.bookingDate} />
                  </div>

                  {isMultipleBooking && (
                    <div>
                      <FieldLabel htmlFor="endDate">End date</FieldLabel>
                      <Input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={bookingDate || new Date().toISOString().split('T')[0]}
                        className={formErrors.endDate ? "border-red-500 hover:cursor-pointer" : "hover:cursor-pointer"}
                      />
                      <FieldError message={formErrors.endDate} />
                    </div>
                  )}
                </div>

                {isMultipleBooking && (
                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium text-gray-700">Days</legend>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day) => (
                        <Label
                          key={day.value}
                          htmlFor={`day-${day.value}`}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal transition-colors ${
                            selectedDays.includes(day.value)
                              ? "border-orange-500 bg-orange-50/40 text-gray-900"
                              : "border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={selectedDays.includes(day.value)}
                            onCheckedChange={() => handleDayToggle(day.value)}
                          />
                          {day.short}
                        </Label>
                      ))}
                    </div>
                    <FieldError message={formErrors.selectedDays} />
                  </fieldset>
                )}

                <div className="grid grid-cols-2 gap-3 sm:gap-5">
                  <TimeField
                    label="Start"
                    hour={startHour}
                    minute={startMinute}
                    onHourChange={setStartHour}
                    onMinuteChange={setStartMinute}
                    hourOptions={hourOptions}
                    minuteOptions={minuteOptions}
                    invalid={!!formErrors.startTime}
                    error={formErrors.startTime}
                  />
                  <TimeField
                    label="End"
                    hour={endHour}
                    minute={endMinute}
                    onHourChange={setEndHour}
                    onMinuteChange={setEndMinute}
                    hourOptions={hourOptions}
                    minuteOptions={minuteOptions}
                    invalid={!!formErrors.endTime}
                    error={formErrors.endTime}
                  />
                </div>

                {isMultipleBooking && showPreview && previewBookings.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
                      <p className="text-sm font-medium text-gray-900">
                        {previewBookings.length} booking{previewBookings.length !== 1 ? "s" : ""} will be created
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-gray-600 hover:cursor-pointer"
                      >
                        {showPreview ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto">
                      {previewBookings.slice(0, 10).map((booking, index) => (
                        <li key={index} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
                          <span className="text-gray-900">{booking.dayName}</span>
                          <span className="tabular-nums text-gray-500">
                            {new Date(booking.date).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {previewBookings.length > 10 && (
                      <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
                        And {previewBookings.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </FormSection>

              <FormSection title="Space">
                <RadioGroup
                  value={bookingType}
                  onValueChange={handleBookingTypeChange}
                  className={`grid gap-3 ${labDetail?.capacity === 0 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
                >
                  <ChoiceOption
                    value="full"
                    id="full"
                    disabled={labDetail?.capacity === 0}
                    lone={labDetail?.capacity === 0}
                    selected={bookingType === "full"}
                    title="Whole room"
                    description={
                      labDetail?.capacity && labDetail.capacity > 0
                        ? `All ${labDetail.capacity} seats are reserved for the event.`
                        : "Flexible space with no seat limit."
                    }
                  />
                  {labDetail?.capacity !== 0 && (
                    <ChoiceOption
                      value="partial"
                      id="partial"
                      selected={bookingType === "partial"}
                      title="Some seats"
                      description="Book only the seats needed. Others can book the rest."
                    />
                  )}
                </RadioGroup>

                {(bookingType === "partial") && (
                  <div className="sm:max-w-[16rem]">
                    <FieldLabel htmlFor="participants">Number of people</FieldLabel>
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
                    {formErrors.participants ? (
                      <FieldError message={formErrors.participants} />
                    ) : (
                      <p className="mt-1.5 text-xs text-gray-500">
                        {labDetail?.capacity && labDetail.capacity > 0
                          ? `Up to ${labDetail.capacity} seats.`
                          : "This room has flexible seating."}
                      </p>
                    )}
                  </div>
                )}
              </FormSection>

              <FormSection title="Event">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <FieldLabel htmlFor="eventName">Event name</FieldLabel>
                    <Input
                      type="text"
                      id="eventName"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="E.g., Algorithm Class, Department Meeting"
                      className={formErrors.eventName ? "border-red-500" : ""}
                    />
                    <FieldError message={formErrors.eventName} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="eventType">Event type</FieldLabel>
                    <Select value={eventType} onValueChange={setEventType}>
                      <SelectTrigger
                        id="eventType"
                        className={`w-full hover:cursor-pointer ${formErrors.eventType ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type} className="hover:cursor-pointer">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={formErrors.eventType} />
                  </div>
                </div>
              </FormSection>

              <FormSection title="Requester">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <div>
                    <FieldLabel htmlFor="requestorName">Full name</FieldLabel>
                    <Input
                      type="text"
                      id="requestorName"
                      value={requestorName}
                      onChange={(e) => setRequestorName(e.target.value)}
                      placeholder="Your full name"
                      className={formErrors.requestorName ? "border-red-500" : ""}
                    />
                    <FieldError message={formErrors.requestorName} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="phone">Phone</FieldLabel>
                    <Input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                      className={formErrors.phone ? "border-red-500" : ""}
                    />
                    <FieldError message={formErrors.phone} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="faculty">Faculty</FieldLabel>
                    <Input
                      type="text"
                      id="faculty"
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      placeholder="Enter your faculty name"
                      className={formErrors.faculty ? "border-red-500" : ""}
                    />
                    <FieldError message={formErrors.faculty} />
                  </div>
                </div>
              </FormSection>

              <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-8 sm:py-6">
                {formErrors.conflict && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
                    <p className="text-sm font-medium text-red-900">Booking conflict</p>
                    <p className="mt-1 text-sm leading-relaxed text-red-800">
                      {formErrors.conflict}
                    </p>
                    <p className="mt-4 text-xs font-medium text-red-900">Suggestions</p>
                    <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-red-800">
                      <li>Try a different time slot</li>
                      <li>Choose a different room</li>
                      {bookingType === "partial" && (
                        <li>Reduce the number of participants</li>
                      )}
                      {bookingType === "full" && (
                        <li>Consider a partial booking if you don&apos;t need the full room</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1.5">
                    {bookingDate && startHour && startMinute && endHour && endMinute && (
                      <AvailabilityStatus
                        checking={checking}
                        invalidTime={!!formErrors.startTime}
                        conflict={!!formErrors.conflict}
                      />
                    )}
                    <p className="max-w-sm text-sm leading-relaxed text-gray-500">
                      Requests are reviewed by the lab administrator before they&apos;re confirmed.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="h-11 w-full shrink-0 bg-orange-600 px-6 text-white hover:cursor-pointer hover:bg-orange-700 sm:w-auto"
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
              </div>
            </form>
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
  );
}
