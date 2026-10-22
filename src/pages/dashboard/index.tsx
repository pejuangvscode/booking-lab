import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { StatusPill } from "~/components/status-pill";
import { api } from '~/utils/api';
import Head from 'next/head';
import { CustomDialog } from "~/components/ui/custom-dialog";
import { useCustomDialog } from "~/hooks/useCustomDialog";
import { useAdminCheck } from '~/hooks/useAdminCheck';

type Booking = {
  id: number;
  createdAt: Date;
  userId: string;
  roomId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  participants: number;
  eventName: string;
  eventType: string;
  phone: string;
  faculty: string;
  status: string;
  requesterName: string | null;
  requesterNIM: string | null;
  lab?: {
    name: string;
    facilityId: string;
  };
  room?: {
    name: string;
    facilityId: string;
  };
};

// Booking lists are one set of rows: a stacked card on phones, a table from md.
// Columns from md: date, event, room, status, action.
const ROW_COLS =
  "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[10.5rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_5.5rem]";

function ListHeader() {
  return (
    <div
      aria-hidden="true"
      className={`hidden ${ROW_COLS} gap-x-4 border-b border-gray-100 bg-gray-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid`}
    >
      <span>Date</span>
      <span>Event</span>
      <span>Room</span>
      <span>Status</span>
      <span />
    </div>
  );
}

/**
 * The whole row is the button. On phones it reads as three left-aligned lines
 * (event and status, date and time, room); from md the action label shows as
 * its own column so the table still says what a click does.
 */
function BookingRow({
  date,
  startTime,
  endTime,
  eventName,
  roomName,
  roomId,
  status,
  actionLabel,
  onOpen,
  disabled,
}: {
  date: string;
  startTime: string;
  endTime: string;
  eventName: string;
  roomName: string;
  roomId: string;
  status: string;
  actionLabel: string;
  onOpen: () => void;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className={`grid w-full ${ROW_COLS} items-start gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors hover:cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 md:items-center md:gap-y-0`}
      >
        <span className="order-1 min-w-0 text-sm font-medium text-gray-900 md:order-none md:col-start-2 md:row-start-1 md:truncate">
          {eventName}
        </span>
        <span className="order-2 justify-self-end md:order-none md:col-start-4 md:row-start-1 md:justify-self-start">
          <StatusPill status={status} />
        </span>
        <span className="order-3 col-span-2 flex flex-wrap gap-x-3 text-sm text-gray-600 md:order-none md:col-span-1 md:col-start-1 md:row-start-1 md:block">
          <span className="md:block md:text-gray-900">{date}</span>
          <span className="tabular-nums md:block md:text-gray-500">
            {startTime}&ndash;{endTime}
          </span>
        </span>
        <span className="order-4 col-span-2 min-w-0 text-sm md:order-none md:col-span-1 md:col-start-3 md:row-start-1">
          <span className="text-gray-600 md:block md:truncate md:text-gray-900">{roomName}</span>
          {roomId !== roomName && (
            <span className="ml-2 text-gray-500 md:ml-0 md:block md:text-xs">{roomId}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="hidden h-8 items-center justify-self-end rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 md:col-start-5 md:row-start-1 md:inline-flex"
        >
          {actionLabel}
        </span>
      </button>
    </li>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <ul aria-hidden="true" className="divide-y divide-gray-100">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className={`grid ${ROW_COLS} animate-pulse items-center gap-x-4 gap-y-2 px-5 py-4 md:gap-y-0`}
        >
          <div className="order-3 col-span-2 h-3.5 w-40 rounded bg-gray-100 md:order-none md:col-span-1" />
          <div className="order-1 h-3.5 w-32 rounded bg-gray-100 md:order-none" />
          <div className="order-4 col-span-2 h-3.5 w-24 rounded bg-gray-100 md:order-none md:col-span-1" />
          <div className="order-2 h-5 w-20 justify-self-end rounded-md bg-gray-100 md:order-none md:justify-self-start" />
          <div className="hidden h-8 w-20 justify-self-end rounded-md bg-gray-100 md:block" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-10 text-center sm:py-14">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{body}</p>
    </div>
  );
}

function Pager({
  label,
  summary,
  page,
  pageCount,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  onPage,
}: {
  label: string;
  summary: string;
  page: number;
  pageCount: number;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPage: (page: number) => void;
}) {
  // One page of results needs no pager; the count already sits beside the heading.
  // Still shown past page 1, so a narrowed search never strands someone there.
  if (pageCount <= 1 && page === 1) return null;

  const stepClass = "h-8 w-8 p-0 text-gray-600 hover:cursor-pointer";
  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm tabular-nums text-gray-500">{summary}</p>
      <nav aria-label={label} className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous page"
          disabled={previousDisabled}
          onClick={onPrevious}
          className={stepClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <Button
            key={n}
            variant="ghost"
            size="sm"
            aria-current={page === n ? "page" : undefined}
            onClick={() => onPage(n)}
            className={`h-8 min-w-8 px-2 tabular-nums hover:cursor-pointer ${
              page === n
                ? "bg-gray-900 text-white hover:bg-gray-900 hover:text-white"
                : "text-gray-600"
            }`}
          >
            {n}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next page"
          disabled={nextDisabled}
          onClick={onNext}
          className={stepClass}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

export default function Dashboard() {
  const { dialogState, closeDialog, confirm, success, error } = useCustomDialog();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { isAdmin } = useAdminCheck();
  
  const [currentEntriesCount, setCurrentEntriesCount] = useState(10);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [completedEntriesCount, setCompletedEntriesCount] = useState(10);
  const [completedSearchTerm, setCompletedSearchTerm] = useState("");
  const [completedPage, setCompletedPage] = useState(1);

  // Booking whose action sheet is currently open.
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);

  const {
    data: currentBookingsData,
    isLoading: isLoadingCurrentBookings,
    isError: isErrorCurrentBookings,
    refetch: refetchCurrentBookings
  } = api.booking.getCurrentUserBookings.useQuery(
    {
      limit: currentEntriesCount,
      page: currentPage,
      search: currentSearchTerm
    },
    {
      enabled: isSignedIn && isMounted,
      refetchOnWindowFocus: false
    }
  );

  const {
    data: completedBookingsData,
    isLoading: isLoadingCompletedBookings,
    isError: isErrorCompletedBookings,
    refetch: refetchCompletedBookings
  } = api.booking.getCompletedUserBookings.useQuery(
    {
      limit: completedEntriesCount,
      page: completedPage,
      search: completedSearchTerm
    },
    {
      enabled: isSignedIn && isMounted,
      refetchOnWindowFocus: false
    }
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Escape closes the action sheet, matching the confirm dialog's behaviour.
  useEffect(() => {
    if (!actionBooking) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionBooking(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [actionBooking]);

  const handleCancelBooking = async (bookingId: number) => {
    const confirmed = await confirm(
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      'Cancel Booking'
    );

    if (confirmed) {
      cancelBookingMutation.mutate({ id: bookingId, cancelReason: "Cancelled by user" });
    }
  };

  const cancelBookingMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      void success("Booking cancelled successfully!");
      void refetchCurrentBookings();
      void refetchCompletedBookings();
    },
    onError: (err) => {
      void error(`Error cancelling booking: ${err.message}`);
    }
  });

  // Format date function
  const formatDate = (date: Date | string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', options);
  };

  // Helper function to get location name safely
  const getLocationInfo = (booking: Booking) => {
    const locationObj = booking.lab || booking.room;
    
    if (!locationObj) {
      return { name: 'Unknown', facilityId: 'Unknown' };
    }
    
    return {
      name: locationObj.name || 'Unknown',
      facilityId: locationObj.facilityId || 'Unknown'
    };
  };

  if (!isMounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Head>
        <title>Dashboard - BookLab</title>
        <meta name="description" content="Manage your room bookings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <header>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
              My bookings
            </h1>
          </div>
        </header>

        {/* Current bookings */}
        <section aria-labelledby="current-heading" className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="current-heading" className="text-lg font-medium tracking-tight text-gray-900">
              Current
              {currentBookingsData && (
                <span className="ml-2 font-normal tabular-nums text-gray-500">
                  {currentBookingsData.total}
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <label htmlFor="current-search" className="sr-only">
                  Search current bookings
                </label>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <Input
                  id="current-search"
                  type="text"
                  placeholder="Search bookings"
                  className="h-9 bg-white pl-9 text-sm"
                  value={currentSearchTerm}
                  onChange={(e) => setCurrentSearchTerm(e.target.value)}
                />
              </div>
              <select
                aria-label="Rows per page"
                className="h-9 shrink-0 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gray-400/50"
                value={currentEntriesCount}
                onChange={(e) => setCurrentEntriesCount(Number(e.target.value))}
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCurrentBookings()}
                aria-label="Refresh"
                title="Refresh"
                className="h-9 w-9 shrink-0 border-gray-200 p-0 text-gray-600 hover:cursor-pointer hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <ListHeader />
            {isLoadingCurrentBookings ? (
              <SkeletonRows count={currentEntriesCount} />
            ) : isErrorCurrentBookings ? (
              <p className="px-5 py-12 text-center text-sm text-red-700">
                Error loading bookings. Please try again.
              </p>
            ) : currentBookingsData && currentBookingsData.bookings.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {currentBookingsData.bookings.map((booking) => {
                  const location = getLocationInfo(booking);
                  return (
                    <BookingRow
                      key={booking.id}
                      date={formatDate(booking.bookingDate)}
                      startTime={booking.startTime}
                      endTime={booking.endTime}
                      eventName={booking.eventName}
                      roomName={location.name}
                      roomId={location.facilityId}
                      status={booking.status}
                      actionLabel="Manage"
                      onOpen={() => setActionBooking(booking)}
                      disabled={cancelBookingMutation.isPending}
                    />
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title={currentSearchTerm ? "Nothing matches your search" : "No current bookings"}
                body={
                  currentSearchTerm
                    ? "Try a different search term."
                    : "New requests stay here until they are finished."
                }
              />
            )}
            <Pager
              label="Current bookings pages"
              summary={
                currentBookingsData
                  ? `Showing ${currentBookingsData.total > 0 ? (currentPage - 1) * currentEntriesCount + 1 : 0}–${Math.min(currentPage * currentEntriesCount, currentBookingsData.total)} of ${currentBookingsData.total}`
                  : "Showing 0 of 0"
              }
              page={currentPage}
              pageCount={
                currentBookingsData
                  ? Math.min(5, Math.ceil(currentBookingsData.total / currentEntriesCount))
                  : 0
              }
              previousDisabled={currentPage === 1}
              nextDisabled={!currentBookingsData || currentPage >= Math.ceil(currentBookingsData.total / currentEntriesCount)}
              onPrevious={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              onNext={() => setCurrentPage(prev => prev + 1)}
              onPage={(page) => setCurrentPage(page)}
            />
          </div>
        </section>

        {/* History: completed, cancelled and rejected bookings */}
        <section aria-labelledby="history-heading" className="mt-12 sm:mt-14">
          <h2 id="history-heading" className="text-lg font-medium tracking-tight text-gray-900">
            History
            {completedBookingsData && (
              <span className="ml-2 font-normal tabular-nums text-gray-500">
                {completedBookingsData.total}
              </span>
            )}
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <ListHeader />
            {isLoadingCompletedBookings ? (
              <SkeletonRows count={completedEntriesCount} />
            ) : isErrorCompletedBookings ? (
              <p className="px-5 py-12 text-center text-sm text-red-700">
                Error loading completed bookings. Please try again.
              </p>
            ) : completedBookingsData && completedBookingsData.bookings.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {completedBookingsData.bookings.map((booking) => {
                  const location = getLocationInfo(booking);
                  return (
                    <BookingRow
                      key={booking.id}
                      date={formatDate(booking.bookingDate)}
                      startTime={booking.startTime}
                      endTime={booking.endTime}
                      eventName={booking.eventName}
                      roomName={location.name}
                      roomId={location.facilityId}
                      status={booking.status}
                      actionLabel="Details"
                      onOpen={() => router.push(`/booking-detail?bookingId=${booking.id}`)}
                    />
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="No past bookings yet"
                body="Completed, cancelled, and rejected bookings end up here."
              />
            )}
            <Pager
              label="History pages"
              summary={
                completedBookingsData
                  ? `Showing ${completedBookingsData.total > 0 ? (completedPage - 1) * completedEntriesCount + 1 : 0}–${Math.min(completedPage * completedEntriesCount, completedBookingsData.total)} of ${completedBookingsData.total}`
                  : "Showing 0 of 0"
              }
              page={completedPage}
              pageCount={
                completedBookingsData
                  ? Math.min(5, Math.ceil(completedBookingsData.total / completedEntriesCount))
                  : 0
              }
              previousDisabled={completedPage === 1}
              nextDisabled={!completedBookingsData || completedPage >= Math.ceil(completedBookingsData.total / completedEntriesCount)}
              onPrevious={() => setCompletedPage(prev => Math.max(prev - 1, 1))}
              onNext={() => setCompletedPage(prev => prev + 1)}
              onPage={(page) => setCompletedPage(page)}
            />
          </div>
        </section>
      </div>

      {/* Action sheet — replaces the row of Details/Complete/Cancel buttons */}
      {actionBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
            onClick={() => setActionBooking(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-lg font-medium text-gray-900">
                {actionBooking.eventName}
              </h3>
              <StatusPill status={actionBooking.status} className="shrink-0" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {formatDate(actionBooking.bookingDate)}
            </p>
            <p className="mt-0.5 text-sm tabular-nums text-gray-500">
              {actionBooking.startTime} &ndash; {actionBooking.endTime}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              {getLocationInfo(actionBooking).name}
            </p>

            <div className="mt-6 space-y-2">
              {actionBooking.status === 'accepted' && (
                <button
                  type="button"
                  onClick={() => {
                    const id = actionBooking.id;
                    setActionBooking(null);
                    void router.push(`/complete-booking?bookingId=${id}`);
                  }}
                  className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700"
                >
                  Complete booking
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const id = actionBooking.id;
                  setActionBooking(null);
                  void router.push(`/booking-detail?bookingId=${id}`);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:cursor-pointer hover:bg-gray-50"
              >
                View details
              </button>

              {(actionBooking.status === 'accepted' || actionBooking.status === 'pending') && (
                <button
                  type="button"
                  onClick={() => {
                    const id = actionBooking.id;
                    setActionBooking(null);
                    void handleCancelBooking(id);
                  }}
                  className="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:cursor-pointer hover:bg-red-50 hover:text-red-800"
                >
                  Cancel booking
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActionBooking(null)}
              className="mt-4 w-full border-t border-gray-100 pt-4 text-sm text-gray-500 transition-colors hover:cursor-pointer hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
