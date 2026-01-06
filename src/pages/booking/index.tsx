import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { AlertTriangle, Building, Loader2, Users } from "lucide-react";
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
      <div className="container mx-auto px-4 py-8 mt-20">
        <Head>
          <title>Sign In Required | UPH Facility Booking</title>
        </Head>
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
            <h2 className="text-3xl font-bold text-white">Authentication Required</h2>
            <p className="text-orange-100 mt-2">
              You need to sign in to book laboratory facilities
            </p>
          </div>
          
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sign In Required
                </h3>
                <p className="text-gray-600">
                  To book laboratory facilities, you need to sign in to your account. 
                  This helps us manage bookings and send you important updates.
                </p>
              </div>
              
              <div className="space-y-3">
                <SignInButton
                  mode="modal"
                  fallbackRedirectUrl={router.asPath}
                >
                  <Button className="hover:cursor-pointer w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center">
                    Sign In to Continue
                  </Button>
                </SignInButton>
                
                <div className="text-sm text-gray-500">
                  Don't have an account? You can create one during sign in.
                </div>
                
                <Link href="/">
                  <Button variant="outline" className="hover:cursor-pointer w-full">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
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
        phone,
        faculty,
        userData: {
          name: requestorName,
          nim: requestorNIM
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 relative overflow-hidden pt-20">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
      </div>
      
      <Head>
        <title>Book a Lab | UPH Facility Booking</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
      {/* User Info Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 h-3 w-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-medium text-blue-800">
                Signed in as: <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{user?.firstName} {user?.lastName}</span>
              </span>
            </div>
            <span className="text-xs text-blue-600 bg-white/50 px-3 py-1 rounded-full">
              {user?.emailAddresses[0]?.emailAddress}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-orange-100 overflow-hidden hover:shadow-3xl transition-all duration-300">
        {/* Header section */}
        <div className="p-8 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent"></div>
          <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">
            {labDetail?.name ? `Book ${labDetail.name}` : "Book Laboratory"}
          </h2>
          {labDetail && (
            <p className="text-orange-50 mt-3 text-lg font-medium">
              <span className="inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-sm">
                {labDetail.type}
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-sm">
                {labDetail.capacity && labDetail.capacity > 0 
                  ? `${labDetail.capacity} seats` 
                  : "Flexible space"}
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-sm">
                {labDetail.department}
              </span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {labDetail?.facilityId && (
              <span className="bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-white/20">
                <span className="opacity-80">ID:</span> {labDetail.facilityId}
              </span>
            )}
            <span className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 border border-green-400">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Available
            </span>
          </div>
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
                <label htmlFor="bookingDate" className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
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
            <div className="space-y-4 bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
              <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
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
                  />
                  <Label htmlFor="full" className="flex-1 cursor-pointer">
                    <Card className={`p-5 border-2 transition-all duration-300 shadow-md hover:shadow-xl ${
                      bookingType === "full" 
                        ? "border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 ring-2 ring-orange-200 scale-105" 
                        : "border-gray-200 hover:border-orange-300 bg-white hover:bg-orange-50/50"
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
                    <RadioGroupItem value="partial" id="partial" />
                    <Label htmlFor="partial" className="flex-1 cursor-pointer">
                      <Card className={`p-5 border-2 transition-all duration-300 shadow-md hover:shadow-xl ${
                        bookingType === "partial" 
                          ? "border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 ring-2 ring-orange-200 scale-105" 
                          : "border-gray-200 hover:border-orange-300 bg-white hover:bg-orange-50/50"
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
              {labDetail?.type !== "staff_room" && (<div className="space-y-2">
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
              </div>)}
              
            </div>

            {/* Note Message */}
            <div className="bg-gray-100 p-4 rounded-md">
              <h4 className="text-sm font-semibold text-gray-700">Note</h4>
              <p className="text-sm text-gray-600 mt-1">
                Booking Request is subject to approval by the lab administrator. Please ensure all details are correct before submitting.
              </p>
            </div>

            {bookingDate && startHour && startMinute && endHour && endMinute && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 shadow-lg">
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
            
            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button 
                type="submit" 
                className="w-full py-5 sm:py-7 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 hover:from-orange-700 hover:via-orange-600 hover:to-orange-700 text-white text-base sm:text-xl font-semibold hover:cursor-pointer shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl border-2 border-orange-400"
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