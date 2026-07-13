import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { AlertTriangle, Building, Loader2, Users, Lock, Wrench } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
  const [faculty, setFaculty] = useState("Faculty of Information & Technology");
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
    <div className="min-h-screen bg-neutral-50 pt-20">
      <Head>
        <title>Book a Lab | UPH Facility Booking</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
      {/* User Info Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">
                Signed in as: <span className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</span>
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {user?.emailAddresses[0]?.emailAddress}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header section */}
        <div className="border-b border-gray-100 px-6 py-6 sm:px-8">
          <div>
          <h2 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
            {labDetail?.name ? `Book ${labDetail.name}` : "Book Laboratory"}
          </h2>
          {labDetail && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                {formatLabType(labDetail.type)}
              </span>
              <span className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                {labDetail.capacity && labDetail.capacity > 0 
                  ? `${labDetail.capacity} seats` 
                  : "Flexible space"}
              </span>
              <span className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                {labDetail.department}
              </span>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {labDetail?.facilityId && (
              <span className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                <span className="text-gray-400">ID:</span> {labDetail.facilityId}
              </span>
            )}
            {underRenovation ? (
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
                Under Construction
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                Available
              </span>
            )}
          </div>
          </div>
        </div>

        {/* Form section */}
        {isLabLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : underRenovation ? (
          <div className="p-6 sm:p-8">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Wrench className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-amber-900">
                Ruangan sedang direnovasi
              </h3>
              <p className="mt-2 text-sm text-amber-800/80">
                {labDetail?.name} untuk sementara tidak dapat dipesan karena sedang
                dalam masa renovasi. Ruangan yang sedang direnovasi: {RENOVATION_ROOM_LABEL}.
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => router.push("/book-room")}
                variant="outline"
              >
                Pilih ruangan lain
              </Button>
            </div>
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
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Booking Date */}
              <div className="space-y-3">
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
                  disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                />
                {formErrors.bookingDate && (
                  <p className="text-red-500 text-xs">{formErrors.bookingDate}</p>
                )}
              </div>

              {/* Time slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <div className="flex space-x-2">
                    <Select value={startHour} onValueChange={setStartHour} disabled={isSubmitting || checking || bookingMutation.status === "pending"}>
                      <SelectTrigger className={`w-full ${formErrors.startTime ? "border-red-500" : "hover:cursor-pointer"}`}>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem className="hover:cursor-pointer" key={`start-hour-${hour}`} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={startMinute} onValueChange={setStartMinute} disabled={isSubmitting || checking || bookingMutation.status === "pending"}>
                      <SelectTrigger className={`w-full ${formErrors.startTime ? "border-red-500" : "hover:cursor-pointer"}`}>
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem className="hover:cursor-pointer" key={`start-min-${minute}`} value={minute}>
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
                    <Select value={endHour} onValueChange={setEndHour} disabled={isSubmitting || checking || bookingMutation.status === "pending"}>
                      <SelectTrigger className="w-full hover:cursor-pointer">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={`end-hour-${hour}`} value={hour} className="hover:cursor-pointer">
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={endMinute} onValueChange={setEndMinute} disabled={isSubmitting || checking || bookingMutation.status === "pending"}>
                      <SelectTrigger className="w-full hover:cursor-pointer">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem key={`end-min-${minute}`} value={minute} className="hover:cursor-pointer">
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

            {/* Booking Type Selection */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <label className="block text-sm font-medium text-gray-700">
                Booking Type
              </label>

              <RadioGroup 
                value={bookingType} 
                onValueChange={handleBookingTypeChange}
                className={`grid gap-4 ${labDetail?.capacity === 0 || labDetail?.type === "staff_room" ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}
                disabled={isSubmitting || checking || bookingMutation.status === "pending"}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="full" 
                    id="full" 
                    disabled={labDetail?.capacity === 0 || labDetail?.type === "staff_room"}
                    className="sr-only"
                  />
                  <Label htmlFor="full" className="flex-1 cursor-pointer w-full">
                    <Card className={`p-5 border transition-colors ${
                      bookingType === "full" 
                        ? "border-orange-500 bg-orange-50" 
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${labDetail?.capacity === 0 || labDetail?.type === "staff_room" ? 'opacity-100' : ''}`}>
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-3">
                          <Building className={`h-5 w-5 ${
                            bookingType === "full" ? "text-orange-600" : "text-gray-400"
                          }`} />
                          <div>
                            <div className="font-medium text-sm">
                              {labDetail?.capacity === 0 || labDetail?.type === "staff_room" ? "Book Entire Space" : "Book Full Room"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {labDetail?.capacity === 0 || labDetail?.type === "staff_room"
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
                {labDetail?.capacity !== 0 && labDetail?.type !== "staff_room" && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial" className="sr-only" />
                    <Label htmlFor="partial" className="flex-1 cursor-pointer w-full">
                      <Card className={`p-5 border transition-colors ${
                        bookingType === "partial" 
                          ? "border-orange-500 bg-orange-50" 
                          : "border-gray-200 bg-white hover:border-gray-300"
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
                  Number of Participants {labDetail?.capacity === 0 || labDetail?.type === "staff_room" && <span className="text-red-500">*</span>}
                </label>
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
                  disabled={isSubmitting || checking || bookingMutation.status === "pending"}
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
                <Select value={eventType} onValueChange={setEventType} disabled={isSubmitting || checking || bookingMutation.status === "pending"}>
                  <SelectTrigger className={formErrors.eventType ? "border-red-500" : "hover:cursor-pointer"}>
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
                {formErrors.eventType && (
                  <p className="text-red-500 text-xs">{formErrors.eventType}</p>
                )}
              </div>

              {/* Faculty */}
              {labDetail?.type !== "staff_room" && (<div className="space-y-2">
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
                  disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                />
                {formErrors.faculty && (
                  <p className="text-red-500 text-xs">{formErrors.faculty}</p>
                )}
              </div>)}
              

              {/* Requestor Phone */}
              {labDetail?.type !== "staff_room" && (<div className="space-y-2">
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
                  disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-xs">{formErrors.phone}</p>
                )}
              </div>)}
              

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
                  disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                />
                {formErrors.requestorName && (
                  <p className="text-red-500 text-xs">{formErrors.requestorName}</p>
                )}
              </div>

              {/* Requestor NIM */}
              {labDetail?.type !== "staff_room" && (
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
                    disabled={isSubmitting || checking || bookingMutation.status === "pending"}
                  />
                  {formErrors.requestorNIM && (
                    <p className="text-red-500 text-xs">{formErrors.requestorNIM}</p>
                  )}
                </div>
              )}
              
            </div>

            {/* Note Message */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700">Note</h4>
              <p className="text-sm text-gray-600 mt-1">
                Booking Request is subject to approval by the lab administrator. Please ensure all details are correct before submitting.
              </p>
            </div>

            {bookingDate && startHour && startMinute && endHour && endMinute && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center space-x-3">
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
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="font-medium">Booking Conflict:</strong>
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
            
            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button 
                type="submit" 
                className="w-full py-5 sm:py-6 bg-orange-600 hover:bg-orange-700 text-white text-base sm:text-lg font-medium hover:cursor-pointer transition-colors rounded-lg"
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