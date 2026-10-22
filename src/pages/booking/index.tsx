import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
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
import { isRoomUnderRenovation, RENOVATION_ROOM_LABEL } from "~/lib/renovation";

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
  const [requestorNIM, setRequestorNIM] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [faculty, setFaculty] = useState("Faculty of Artificial Intelligence and Data Science");
  const [checking, setChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const conflictCheck = api.booking.checkConflicts.useQuery(
    { 
      labId: labId as string,
      bookingDate: bookingDate,
      startTime: `${startHour}:${startMinute}`,
      endTime: `${endHour}:${endMinute}`,
      participants: calculateParticipants(),
      bookingType: bookingType as "full" | "partial"
    },
    { 
      enabled: false,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 30000,
    }
  );

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
      await router.push("/dashboard");
    },
    onError: async (err) => {
      setIsSubmitting(false);
      await error(`Failed to create booking: ${err.message}`, "Booking Error");
    }
  });

  useEffect(() => {
    if (labDetail?.capacity === 0) {
      setBookingType("full");
      setParticipants("0");
    }
    else if (labDetail?.type === "staff_room") {
      setBookingType("full");
      // Set participants ke capacity penuh (contoh: 50 untuk MH16, 14 untuk MM16)
      const maxCapacity = labDetail?.capacity || 0;
      setParticipants(maxCapacity.toString());
    }
  }, [labDetail]);

  useEffect(() => { 
    const checkAvailabilityDebounced = async () => {
      if (bookingDate && startHour && startMinute && endHour && endMinute && labDetail) {
        
        const now = new Date();
        const startTimeValue = `${startHour}:${startMinute}`;
        const bookingDateTime = new Date(`${bookingDate}T${startTimeValue}:00`);
        const minimumAdvanceTime = new Date(now.getTime() + (60 * 60 * 1000));
        
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.conflict;
          delete newErrors.startTime;
          return newErrors;
        });
        
        if (bookingDateTime <= now) {
          setFormErrors(prev => ({
            ...prev,
            startTime: "Cannot book for past time. Please select a future time."
          }));
          return;
        }
        
        if (bookingDateTime < minimumAdvanceTime) {
          setFormErrors(prev => ({
            ...prev,
            startTime: "Booking must be at least 1 hour in advance."
          }));
          return;
        }
        
        try {
          const finalParticipants = labDetail?.capacity === 0 || labDetail?.type === "staff_room"
            ? parseInt(participants) || 1
            : bookingType === "full" 
              ? (labDetail?.capacity || parseInt(participants) || 1)
              : parseInt(participants) || 1;

          const conflictResult = await utils.client.booking.checkConflicts.query({
            labId: labId as string,
            bookingDate: bookingDate,
            startTime: startTimeValue,
            endTime: `${endHour}:${endMinute}`,
            participants: finalParticipants,
            bookingType: bookingType as "full" | "partial"
          });
          
          if (conflictResult?.hasConflicts) {
            setFormErrors(prev => ({
              ...prev,
              conflict: conflictResult.message
            }));
          } else {
            setFormErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.conflict;
              return newErrors;
            });
          }
        } catch (error) {
          console.error("Availability check failed:", error);
        }
      }
    };

    const timeoutId = setTimeout(checkAvailabilityDebounced, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    bookingDate, 
    startHour, 
    startMinute, 
    endHour, 
    endMinute, 
    participants, 
    bookingType, 
    labDetail?.capacity,
    labDetail?.id,
    labId,
    utils.client
  ]);

  
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
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

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-24">
        <Head>
          <title>Sign In Required | UPH Facility Booking</title>
        </Head>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mt-5 text-xl font-medium tracking-tight text-gray-900">
            Sign in to continue
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            You need to be signed in to book a lab. Signing in lets us keep track of your bookings and send you updates.
          </p>
          <div className="mt-6 space-y-3">
            <SignInButton mode="modal" fallbackRedirectUrl={router.asPath}>
              <Button className="w-full bg-orange-600 text-white hover:bg-orange-700 hover:cursor-pointer">
                Sign in
              </Button>
            </SignInButton>
            <Link href="/">
              <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:cursor-pointer">
                Back to home
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-gray-400">
            Don&apos;t have an account? You can create one during sign in.
          </p>
        </div>
      </div>
    );
  }

  const formatLabType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const underRenovation = !!labDetail && isRoomUnderRenovation(labDetail);

  const hourOptions = Array.from({ length: 13 }, (_, i) => (i + 7).toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  const eventTypes = ["Class", "Seminar", "Workshop", "Meeting", "Exam", "Other"];

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
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const errors: { [key: string]: string } = {};
    if (!bookingDate) errors.bookingDate = "Booking date is required";
    if (!startHour || !startMinute) errors.startTime = "Start time is required";
    if (!endHour || !endMinute) errors.endTime = "End time is required";
    if (!eventName) errors.eventName = "Event name is required";
    if (!eventType) errors.eventType = "Event type is required";
    if (!phone && labDetail?.type !== "staff_room") errors.phone = "Phone number is required";
    if (!requestorName) errors.requestorName = "Requestor name is required";
    if (!requestorNIM && labDetail?.type !== "staff_room") errors.requestorNIM = "Requestor NIM is required";
    if (!faculty && labDetail?.type !== "staff_room") errors.faculty = "Faculty is required";

    const startTimeValue = `${startHour}:${startMinute}`;
    const endTimeValue = `${endHour}:${endMinute}`;

    if (startTimeValue >= endTimeValue) {
      errors.endTime = "End time must be after start time";
    }

    if (bookingDate && startHour && startMinute) {
      const now = new Date();
      const bookingDateTime = new Date(`${bookingDate}T${startTimeValue}:00`);
      const minimumAdvanceTime = new Date(now.getTime() + (60 * 60 * 1000));
      
      if (bookingDateTime <= now) {
        errors.startTime = "Cannot book for past time. Please select a future time.";
      } else if (bookingDateTime < minimumAdvanceTime) {
        errors.startTime = "Booking must be at least 1 hour in advance.";
      }
    }

    if (labDetail?.capacity === 0 || labDetail?.type === "staff_room") {
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

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      await alert("Please fix the form errors before submitting.", "Form Validation");
      return;
    }
    
    const finalParticipants = labDetail?.capacity === 0 || labDetail?.type === "staff_room"
      ? parseInt(participants) || 0
      : bookingType === "full" 
        ? (labDetail?.capacity || parseInt(participants) || 1)
        : parseInt(participants) || 1;

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
        setFormErrors({
          conflict: errorMessage
        });
        return;
      }
      
      const confirmed = await confirm(
        `Are you sure you want to book ${labDetail?.name} for ${eventName} on ${new Date(bookingDate).toLocaleDateString()} from ${startTimeValue} to ${endTimeValue}${finalParticipants === 0 ? ' (flexible space)' : ` for ${finalParticipants} participant${finalParticipants !== 1 ? 's' : ''}`}?`,
        "Confirm Booking"
      );
      
      if (!confirmed) {
        return;
      }
      
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
          nim: labDetail?.type !== "staff_room" ? requestorNIM : ""
        }
      };
      
      bookingMutation.mutate(bookingData);
      
    } catch (err) {
      setChecking(false);
      console.error("Error checking conflicts :", err);
      await error("Could not check for booking conflicts. Please try again.", "Connection Error");
      setFormErrors({
        conflict: "Could not check for booking conflicts. Please try again."
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 pb-16 pt-24 sm:px-6">
      <Head>
        <title>Book a Lab | UPH Facility Booking</title>
      </Head>

      <div className="mx-auto max-w-3xl">
        <Link
          href="/book-room"
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
                    {underRenovation ? (
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Under Construction
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Available
                      </span>
                    )}
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
          ) : underRenovation ? (
            <div className="px-6 py-8 sm:px-8">
              <h2 className="text-base font-medium text-gray-900">
                Ruangan sedang direnovasi
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600">
                {labDetail?.name} untuk sementara tidak dapat dipesan karena sedang
                dalam masa renovasi. Ruangan yang sedang direnovasi: {RENOVATION_ROOM_LABEL}.
              </p>
              <Button
                onClick={() => router.push("/book-room")}
                variant="outline"
                className="mt-5 border-gray-200 bg-white text-gray-700 hover:cursor-pointer hover:bg-gray-50"
              >
                Pilih ruangan lain
              </Button>
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
                  onClick={() => router.push("/lab-search")}
                  variant="outline"
                  className="mt-4 border-red-200 bg-white text-red-700 hover:cursor-pointer hover:bg-red-50 hover:text-red-800"
                >
                  Return to lab search
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              <FormSection title="Date and time" hint="Book at least 1 hour ahead.">
                <div className="sm:max-w-[16rem]">
                  <FieldLabel htmlFor="bookingDate">Date</FieldLabel>
                  <Input
                    type="date"
                    id="bookingDate"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={formErrors.bookingDate ? "border-red-500" : ""}
                    disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                  />
                  <FieldError message={formErrors.bookingDate} />
                </div>
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
                    disabled={isSubmitting || checking || bookingMutation.status === "pending"}
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
                    disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                    error={formErrors.endTime}
                  />
                </div>
              </FormSection>

              <FormSection title="Space">
                <RadioGroup
                  value={bookingType}
                  onValueChange={handleBookingTypeChange}
                  className={`grid gap-3 ${labDetail?.capacity === 0 || labDetail?.type === "staff_room" ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
                  disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                >
                  <ChoiceOption
                    value="full"
                    id="full"
                    disabled={labDetail?.capacity === 0 || labDetail?.type === "staff_room"}
                    lone={labDetail?.capacity === 0 || labDetail?.type === "staff_room"}
                    selected={bookingType === "full"}
                    title="Whole room"
                    description={
                      labDetail?.capacity && labDetail.capacity > 0
                        ? `All ${labDetail.capacity} seats are reserved for your event.`
                        : "Flexible space with no seat limit."
                    }
                  />
                  {labDetail?.capacity !== 0 && labDetail?.type !== "staff_room" && (
                    <ChoiceOption
                      value="partial"
                      id="partial"
                      selected={bookingType === "partial"}
                      title="Some seats"
                      description="Book only the seats you need. Others can book the rest."
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
                        labDetail?.capacity === 0 || labDetail?.type === "staff_room"
                          ? "Enter number of participants (required)"
                          : labDetail?.capacity && labDetail.capacity > 0
                            ? `Enter number (max: ${labDetail.capacity})`
                            : "Enter number of participants"
                      }
                      className={formErrors.participants ? "border-red-500" : ""}
                      required={labDetail?.capacity === 0 || labDetail?.type === "staff_room"}
                      disabled={isSubmitting || checking || bookingMutation.status === "pending"}
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
                      disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                    />
                    <FieldError message={formErrors.eventName} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="eventType">Event type</FieldLabel>
                    <Select value={eventType} onValueChange={setEventType} disabled={isSubmitting || checking || bookingMutation.status === "pending"}>
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

              <FormSection title="Your details">
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
                      disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                    />
                    <FieldError message={formErrors.requestorName} />
                  </div>

                  {labDetail?.type !== "staff_room" && (
                    <div>
                      <FieldLabel htmlFor="requestorNIM">NIM</FieldLabel>
                      <Input
                        type="text"
                        id="requestorNIM"
                        value={requestorNIM}
                        onChange={(e) => setRequestorNIM(e.target.value)}
                        placeholder="Your student ID number"
                        className={formErrors.requestorNIM ? "border-red-500" : ""}
                        disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                      />
                      <FieldError message={formErrors.requestorNIM} />
                    </div>
                  )}

                  {labDetail?.type !== "staff_room" && (
                    <div>
                      <FieldLabel htmlFor="phone">Phone</FieldLabel>
                      <Input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone number"
                        className={formErrors.phone ? "border-red-500" : ""}
                        disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                      />
                      <FieldError message={formErrors.phone} />
                    </div>
                  )}

                  {labDetail?.type !== "staff_room" && (
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="faculty">Faculty</FieldLabel>
                      <Input
                        type="text"
                        id="faculty"
                        value={faculty}
                        onChange={(e) => setFaculty(e.target.value)}
                        placeholder="Enter your faculty name"
                        className={formErrors.faculty ? "border-red-500" : ""}
                        disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                      />
                      <FieldError message={formErrors.faculty} />
                    </div>
                  )}
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
                    disabled={bookingMutation.status === "pending" || checking || isSubmitting}
                  >
                    {bookingMutation.status === "pending" || isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : checking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking availability...
                      </>
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
