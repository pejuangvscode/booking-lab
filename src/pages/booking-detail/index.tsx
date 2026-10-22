import { useAuth } from '@clerk/nextjs';
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { useCustomDialog } from "~/hooks/useCustomDialog";
import { api } from "~/utils/api";

const STATUS_STYLES: Record<string, { label: string; badge: string; dot: string }> = {
  accepted: { label: "Accepted", badge: "bg-green-50 text-green-700", dot: "bg-green-500" },
  pending: { label: "Pending", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  rejected: { label: "Rejected", badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  completed: { label: "Completed", badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
};

const getStatus = (status: string) =>
  STATUS_STYLES[(status ?? "").toLowerCase()] ?? {
    label: status || "Unknown",
    badge: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  };

function StatusPill({ status }: { status: string }) {
  const { label, badge, dot } = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <h2 className="border-b border-gray-100 px-5 py-3.5 text-sm font-medium text-gray-900">
        {title}
      </h2>
      <dl className="divide-y divide-gray-100 px-5">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-24 sm:pt-28">{children}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <PageShell>
      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 h-8 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-gray-100" />
                <div className="h-4 w-2/3 rounded bg-gray-100" />
                <div className="h-4 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/2 rounded bg-gray-100" />
            <div className="h-4 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// Treat null, undefined and blank strings alike — staff-room bookings store
// empty strings for fields such as NIM and faculty.
const orDash = (value?: string | null) => (value?.trim() ? value : "—");

const formatDate = (value: string | Date) => {
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return isNaN(date.getTime()) ? "Invalid date" : format(date, "EEEE, d MMMM yyyy");
  } catch {
    return String(value);
  }
};

const formatDateShort = (value: string | Date) => {
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy");
  } catch {
    return "—";
  }
};

const formatTime = (value: string) => {
  try {
    if (!value || typeof value !== "string") return "—";
    const [hours, minutes] = value.split(":");
    if (!hours || !minutes) return value;
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(date, "HH:mm");
  } catch {
    return String(value);
  }
};

const toMinutes = (value: string) => {
  const parts = value.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  return isNaN(hours) || isNaN(minutes) ? null : hours * 60 + minutes;
};

const getDuration = (start?: string, end?: string) => {
  if (!start || !end) return "—";
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === null || to === null || to <= from) return "—";
  const total = to - from;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
};

export default function BookingDetailPage() {
  const { dialogState, closeDialog, confirm, success, error } = useCustomDialog();
  const router = useRouter();
  const { bookingId } = router.query;
  const { isLoaded, isSignedIn } = useAuth();

  const parsedId = bookingId ? parseInt(bookingId as string, 10) : 0;
  const hasValidId = !!bookingId && !isNaN(parsedId);

  const {
    data: booking,
    isLoading: isBookingLoading,
    error: bookingError,
    refetch,
  } = api.booking.getById.useQuery(
    { id: parsedId },
    {
      enabled: hasValidId && isSignedIn && isLoaded,
      retry: (failureCount) => failureCount < 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  const {
    data: rejectionData,
    isLoading: isRejectionLoading,
    error: rejectionError,
  } = api.booking.getRejectionReason.useQuery(
    { id: parsedId },
    {
      enabled:
        hasValidId &&
        isSignedIn &&
        isLoaded &&
        booking?.status?.toLowerCase() === "rejected",
      retry: false,
    }
  );

  const {
    data: acceptanceData,
    error: acceptanceError,
  } = api.booking.getAcceptedReason.useQuery(
    { id: parsedId },
    {
      enabled:
        hasValidId &&
        isSignedIn &&
        isLoaded &&
        booking?.status?.toLowerCase() === "accepted",
      retry: false,
    }
  );

  const cancelBookingMutation = api.booking.cancelBooking.useMutation({
    onSuccess: () => {
      void success("Booking cancelled successfully!");
      void refetch();
    },
    onError: (mutationError) => {
      void error(`Error cancelling booking: ${mutationError.message}`);
    },
  });

  if (!isLoaded || (hasValidId && isSignedIn && isBookingLoading)) {
    return <Skeleton />;
  }

  if (!isSignedIn) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-gray-900">
            Sign in to continue
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            You need to be signed in to view this booking.
          </p>
          <Link href="/sign-in" className="mt-6 inline-block w-full">
            <Button className="w-full bg-orange-600 text-white hover:cursor-pointer hover:bg-orange-700">
              Sign in
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!hasValidId) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Invalid booking ID. Please check the link and try again.
        </div>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button
            variant="outline"
            className="border-gray-200 text-gray-700 hover:cursor-pointer hover:bg-gray-50"
          >
            Back to dashboard
          </Button>
        </Link>
      </PageShell>
    );
  }

  if (bookingError || !booking) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {bookingError?.message ??
            "Booking not found, or you don't have permission to view it."}
        </div>

        {process.env.NODE_ENV === "development" && bookingError && (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600">
            {JSON.stringify(bookingError, null, 2)}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => void refetch()}
            variant="outline"
            disabled={isBookingLoading}
            className="border-gray-200 text-gray-700 hover:cursor-pointer hover:bg-gray-50"
          >
            {isBookingLoading ? "Retrying…" : "Try again"}
          </Button>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700 hover:cursor-pointer hover:bg-gray-50"
            >
              Back to dashboard
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const status = (booking.status ?? "").toLowerCase();
  const canCancel = ["confirmed", "pending"].includes(status);
  const isFullRoom =
    !!booking.room?.capacity && booking.participants >= booking.room.capacity;
  const adminNote = acceptanceData?.adminNote?.trim();

  const handleCancel = async () => {
    const confirmed = await confirm(
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      "Cancel booking"
    );
    if (!confirmed) return;
    cancelBookingMutation.mutate({ id: parsedId });
  };

  return (
    <>
      <Head>
        <title>Booking Details | BookLab</title>
      </Head>

      <PageShell>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:cursor-pointer hover:text-gray-900"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Header */}
        <header className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
              {booking.eventName || "Booking details"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Booking #{booking.id}
              {booking.createdAt && <>, submitted {formatDateShort(booking.createdAt)}</>}
            </p>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main — sits second on mobile so the status card stays near the top */}
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
            <Section title="Schedule">
              <Row label="Date" value={formatDate(booking.bookingDate)} />
              <Row
                label="Time"
                value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`}
              />
              <Row label="Duration" value={getDuration(booking.startTime, booking.endTime)} />
              <Row label="Event type" value={orDash(booking.eventType)} />
              <Row label="Participants" value={booking.participants ?? 0} />
              <Row label="Faculty" value={orDash(booking.faculty)} />
            </Section>

            <Section title="Room">
              {booking.room ? (
                <>
                  <Row label="Name" value={orDash(booking.room.name)} />
                  <Row label="Facility ID" value={orDash(booking.room.facilityId)} />
                  <Row label="Type" value={orDash(booking.room.type)} />
                  <Row
                    label="Capacity"
                    value={
                      booking.room.capacity && booking.room.capacity > 0
                        ? `${booking.room.capacity} seats`
                        : "Flexible space"
                    }
                  />
                  <Row label="Department" value={orDash(booking.room.department)} />
                  <Row label="Booking type" value={isFullRoom ? "Full room" : "Partial room"} />
                </>
              ) : (
                <div className="py-4 text-sm text-gray-500">
                  Room information is not available.
                </div>
              )}
            </Section>

            <Section title="Requester">
              <Row label="Name" value={orDash(booking.requesterName)} />
              <Row label="NIM" value={orDash(booking.requesterNIM)} />
              <Row label="Phone" value={orDash(booking.phone)} />
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="order-1 space-y-6 lg:order-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-medium text-gray-900">Status</h2>
              <div className="mt-3">
                <StatusPill status={booking.status} />
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                {booking.createdAt && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-gray-500">Submitted</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDateShort(booking.createdAt)}
                    </dd>
                  </div>
                )}
                {status === "accepted" && acceptanceData?.approvedAt && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-gray-500">Approved</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDateShort(acceptanceData.approvedAt)}
                    </dd>
                  </div>
                )}
              </dl>

              {status === "pending" && (
                <p className="mt-4 text-sm leading-relaxed text-gray-500">
                  Waiting for the lab administrator to review your request.
                </p>
              )}

              {status === "rejected" && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500">Reason</p>
                  {isRejectionLoading ? (
                    <div className="mt-1.5 h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                  ) : (
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                      {rejectionError
                        ? "The reason could not be loaded."
                        : orDash(rejectionData?.rejectionReason)}
                    </p>
                  )}
                </div>
              )}

              {status === "accepted" && !acceptanceError && adminNote && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500">Note from admin</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                    {adminNote}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-medium text-gray-900">Actions</h2>
              <div className="mt-4 space-y-2">
                {canCancel && (
                  <Button
                    onClick={handleCancel}
                    disabled={cancelBookingMutation.isPending}
                    variant="outline"
                    className="w-full border-red-200 bg-white text-red-700 hover:cursor-pointer hover:bg-red-50 hover:text-red-800"
                  >
                    {cancelBookingMutation.isPending ? "Cancelling…" : "Cancel booking"}
                  </Button>
                )}
                <Link href="/book-room" className="block">
                  <Button className="w-full bg-orange-600 text-white hover:cursor-pointer hover:bg-orange-700">
                    Book another room
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 hover:cursor-pointer hover:bg-gray-50"
                  >
                    Back to dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </PageShell>

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
    </>
  );
}
