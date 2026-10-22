import { ArrowLeft, ChevronLeft, Search } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { PhotoLightbox } from "~/components/photo-lightbox";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { isRoomBookable, isRoomListed, ROOM_STATUS_LABEL, toRoomStatus } from "~/lib/room-status";

type Lab = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  roomType?: string;
  status?: string;
  capacity: number;
  image?: string | null;
  picIds?: string | string[] | null;
};

type SortField = "name" | "facilityId" | "type" | "capacity";

type AdminRoomListProps = {
  /** Which category this page lists. */
  roomType: "student_lab" | "staff_room";
  heading: string;
  pageTitle: string;
  /** "lab" / "labs" or "room" / "rooms", for the empty-state copy. */
  noun: { one: string; many: string };
  /** Category colour for the Book button (blue for labs, orange for staff rooms). */
  bookButtonClass: string;
};

// The door code sits beside the name, unless the name already contains it
// (e.g. "Lab F209"), so it never reads twice.
const showsCode = (lab: Lab) =>
  !lab.name.toUpperCase().includes(lab.facilityId.toUpperCase());

const capacityLabel = (lab: Lab) =>
  lab.capacity > 0 ? `${lab.capacity} seats` : "Flexible space";

/**
 * The "Book as admin" room list for one category. The access, filtering,
 * sorting, pagination, and booking-route logic is carried over unchanged from
 * the original single admin lab page; the only addition is the category
 * filter that splits student labs from staff rooms.
 */
export function AdminRoomList({
  roomType,
  heading,
  pageTitle,
  noun,
  bookButtonClass,
}: AdminRoomListProps) {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [openLabId, setOpenLabId] = useState<string | null>(null);

  const {
    data: labData = [],
    isLoading: isLabsLoading,
    error: labsError,
  } = api.admin.getAccessibleLabs.useQuery(undefined, {
    enabled: isLoaded && isSignedIn && !!user?.id,
  });

  const {
    data: currentUser,
    isLoading: isUserLoading,
  } = api.user.getCurrentUser.useQuery(undefined, {
    enabled: isLoaded && isSignedIn && !!user?.id,
  });

  const isUserPICForLab = (lab: Lab) => {
    if (!user?.id || !lab.picIds) return false;

    try {
      // Parse picIds from JSON if it's a string
      const picIdsArray = typeof lab.picIds === 'string'
        ? (JSON.parse(lab.picIds) as string[])
        : Array.isArray(lab.picIds)
          ? lab.picIds
          : [];

      return picIdsArray.includes(user.id);
    } catch {
      return false;
    }
  };

  // Check if user is super_admin
  const isUserSuperAdmin = () => {
    if (!user) return false;

    // First check Clerk metadata
    const clerkRole = user.publicMetadata?.role as string;
    if (clerkRole === 'super_admin') {
      return true;
    }

    // Fallback to database role if available
    if (currentUser && currentUser.role === 'super_admin') {
      return true;
    }
    return false;
  };

  const filteredData = labData.filter((lab: Lab) => {
    // Only this page's category (student labs or staff rooms)
    if ((lab.roomType ?? "student_lab") !== roomType) return false;

    // Rooms marked not_available are not offered for booking at all.
    if (!isRoomListed(lab.status)) return false;

    // First apply search filter
    const matchesSearch = lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.facilityId.toString().toLowerCase().includes(searchTerm.toLowerCase());

    // Then apply room type filter
    const matchesType = roomTypeFilter === "all" || lab.type === roomTypeFilter;

    // Check if user is super admin
    const isSuperAdmin = isUserSuperAdmin();

    // If super admin, show all labs that match search and type
    if (isSuperAdmin) {
      return matchesSearch && matchesType;
    }

    // If not super admin, only show labs where user is PIC
    const isPIC = isUserPICForLab(lab);

    return matchesSearch && matchesType && isPIC;
  });

  const sortedData = [...filteredData].sort((a: Lab, b: Lab) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // The thumbnail the open photo zooms out of (and back into on close).
  const [previewOrigin, setPreviewOrigin] = useState<HTMLElement | null>(null);
  const openLab = labData.find((lab) => lab.id === openLabId);

  const openPreview = (labId: string, origin: HTMLElement | null) => {
    setPreviewOrigin(origin);
    setOpenLabId(labId);
  };

  const closePreview = useCallback(() => setOpenLabId(null), []);

  // Show loading state while Clerk is initializing
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-gray-500">Loading authentication…</p>
      </div>
    );
  }

  // Handle booking based on user's role and PIC status
  const handleBooking = (lab: Lab) => {
    const isSuperAdmin = isUserSuperAdmin();

    if (isSuperAdmin) {
      // Super admin - always go to admin booking regardless of PIC status
      void router.push(`/admin/booking?labId=${lab.id}`);
    } else if (isUserPICForLab(lab)) {
      // User is PIC for this lab - go to admin booking
      void router.push(`/admin/booking?labId=${lab.id}`);
    } else {
      // User is not PIC for this lab - go to regular user booking
      void router.push(`/booking?labId=${lab.id}`);
    }
  };

  const isLoading = isLabsLoading || isUserLoading;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="Search and book available laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 pb-20 pt-24 sm:pt-28">
          {/* Back */}
          <button
            onClick={() => router.push('/admin/lab-search')}
            className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 hover:cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Categories
          </button>

          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
              {heading}
            </h1>
          </header>

          {/* Loading */}
          {isLoading && (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex animate-pulse items-start gap-4 p-3 sm:items-center sm:p-4">
                  <div className="h-[4.5rem] w-24 shrink-0 rounded-lg bg-gray-100 sm:h-24 sm:w-32" />
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full space-y-2.5">
                      <div className="h-4 w-1/2 rounded bg-gray-100" />
                      <div className="h-3.5 w-1/3 rounded bg-gray-100" />
                    </div>
                    <div className="h-9 w-16 shrink-0 rounded-md bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {labsError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
              <p className="text-sm font-medium text-red-900">Failed to load {noun.many}</p>
              <p className="mt-1 text-sm leading-relaxed text-red-800">
                Please try again in a moment.
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-4 border-red-200 bg-white text-red-700 hover:cursor-pointer hover:bg-red-50 hover:text-red-800"
              >
                Try again
              </Button>
            </div>
          )}

          {/* List */}
          {!isLoading && !labsError && (
            <>
              {currentItems.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {isUserSuperAdmin() ? "No results found" : `No ${noun.many} assigned`}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                    {isUserSuperAdmin()
                      ? "Try adjusting your search."
                      : `You are not assigned as PIC for any ${noun.many} yet. Contact the super admin to get ${noun.one} assignments.`}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {currentItems.map((lab) => {
                    // Under construction: listed, greyed, and not bookable.
                    const closed = !isRoomBookable(lab.status);
                    return (
                    <li key={lab.id} className={closed ? 'bg-gray-50' : undefined}>
                      <div
                        className={`flex items-start gap-4 p-3 transition-colors sm:items-center sm:p-4 ${
                          lab.image ? 'cursor-pointer' : ''
                        } ${closed ? '' : 'hover:bg-gray-50/70'}`}
                        onClick={(e) => {
                          if (!lab.image) return;
                          openPreview(
                            lab.id,
                            e.currentTarget.querySelector<HTMLElement>('[data-preview-thumb]'),
                          );
                        }}
                      >
                        {/* Tap the photo (or the row) to view it full screen. */}
                        <button
                          type="button"
                          data-preview-thumb
                          disabled={!lab.image}
                          aria-haspopup="dialog"
                          aria-label={lab.image ? `View photo of ${lab.name}` : `No photo of ${lab.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(lab.id, e.currentTarget);
                          }}
                          className={`relative h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 transition-opacity enabled:cursor-zoom-in enabled:hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gray-400/50 sm:h-24 sm:w-32 ${
                            closed ? 'opacity-60' : ''
                          }`}
                        >
                          {lab.image && (
                            <img
                              src={lab.image}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                // Leave the grey tile rather than a broken-image glyph.
                                e.currentTarget.style.visibility = 'hidden';
                              }}
                            />
                          )}
                        </button>

                        {/* Phones stack name, details, and action beside the photo;
                            from sm up the action moves to the right edge. */}
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className={`min-w-0 ${closed ? 'opacity-60' : ''}`}>
                            <h2 className="text-base font-medium text-gray-900">
                              {lab.name}
                              {showsCode(lab) && (
                                <span className="ml-2 whitespace-nowrap font-normal tabular-nums text-gray-500">
                                  {lab.facilityId}
                                </span>
                              )}
                            </h2>
                            <p className="mt-1 text-sm tabular-nums text-gray-500">
                              {capacityLabel(lab)}
                            </p>
                          </div>

                          {closed ? (
                            <span className="inline-flex shrink-0 items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
                              {ROOM_STATUS_LABEL[toRoomStatus(lab.status)]}
                            </span>
                          ) : (
                            <Button
                              className={`shrink-0 text-white hover:cursor-pointer ${bookButtonClass}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBooking(lab);
                              }}
                            >
                              Book
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    className="border-gray-200 bg-white text-gray-700 hover:cursor-pointer hover:bg-gray-50"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pageNum) => {
                    const isCurrent = currentPage === pageNum;
                    return (
                      <Button
                        key={pageNum}
                        variant="outline"
                        aria-current={isCurrent ? "page" : undefined}
                        className={`w-9 px-0 tabular-nums hover:cursor-pointer ${
                          isCurrent
                            ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-900 hover:text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    className="border-gray-200 bg-white text-gray-700 hover:cursor-pointer hover:bg-gray-50"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {openLab?.image && (
        <PhotoLightbox
          src={openLab.image}
          alt={`Room ${openLab.name}`}
          caption={showsCode(openLab) ? `${openLab.name} (${openLab.facilityId})` : openLab.name}
          originEl={previewOrigin}
          onClose={closePreview}
        />
      )}
    </>
  );
}
