import { ArrowLeft, ChevronLeft, Search } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { PhotoLightbox } from "~/components/photo-lightbox";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { isRoomBookable, ROOM_STATUS_LABEL, toRoomStatus } from "~/lib/room-status";

type Room = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image?: string | null;
  roomType?: string;
  status?: string;
};

// The door code sits beside the name, unless the name already contains it
// (e.g. "Lab F209"), so it never reads twice.
const showsCode = (room: Room) =>
  !room.name.toUpperCase().includes(room.facilityId.toUpperCase());

const capacityLabel = (room: Room) =>
  room.capacity > 0 ? `${room.capacity} seats` : "Flexible space";

export default function StaffRoomList() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  const {
    data: roomData = [],
    isLoading,
    error,
  } = api.lab.getStaffRooms.useQuery();

  const filteredData = roomData.filter((room: Room) => {
    return (
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.facilityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // The thumbnail the open photo zooms out of (and back into on close).
  const [previewOrigin, setPreviewOrigin] = useState<HTMLElement | null>(null);
  const openRoom = roomData.find((room) => room.id === openRoomId);

  const openPreview = (roomId: string, origin: HTMLElement | null) => {
    setPreviewOrigin(origin);
    setOpenRoomId(roomId);
  };

  const closePreview = useCallback(() => setOpenRoomId(null), []);

  return (
    <>
      <Head>
        <title>Staff Room - BookLab</title>
        <meta name="description" content="Browse and book staff rooms at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 pb-20 pt-24 sm:pt-28">
          {/* Back */}
          <button
            onClick={() => router.push('/book-room')}
            className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 hover:cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Categories
          </button>

          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
              Staff rooms
            </h1>
          </header>

          {/* Search */}
          {/* <div className="relative mb-8">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or room ID"
              className="h-11 rounded-xl border-gray-200 bg-white pl-10 text-base shadow-none focus-visible:border-orange-400 focus-visible:ring-orange-400/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div> */}

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
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              Failed to load rooms. Please try again later.
            </div>
          )}

          {/* List */}
          {!isLoading && !error && (
            filteredData.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                <p className="text-sm font-medium text-gray-900">No rooms available</p>
                <p className="mt-1 text-sm text-gray-500">There are no staff rooms to book right now.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {filteredData.map((room) => {
                  // Not-available rooms never reach this list; anything else that is not
                  // active (under construction) is shown greyed out without a Book button.
                  const underRenovation = !isRoomBookable(room.status);
                  return (
                    <li key={room.id} className={underRenovation ? 'bg-gray-50' : undefined}>
                      <div
                        className={`flex items-start gap-4 p-3 transition-colors sm:items-center sm:p-4 ${
                          room.image ? 'cursor-pointer' : ''
                        } ${underRenovation ? '' : 'hover:bg-gray-50/70'}`}
                        onClick={(e) => {
                          if (!room.image) return;
                          openPreview(
                            room.id,
                            e.currentTarget.querySelector<HTMLElement>('[data-preview-thumb]'),
                          );
                        }}
                      >
                        {/* Tap the photo (or the row) to view it full screen. */}
                        <button
                          type="button"
                          data-preview-thumb
                          disabled={!room.image}
                          aria-haspopup="dialog"
                          aria-label={room.image ? `View photo of ${room.name}` : `No photo of ${room.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(room.id, e.currentTarget);
                          }}
                          className={`relative h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 transition-opacity enabled:cursor-zoom-in enabled:hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gray-400/50 sm:h-24 sm:w-32 ${
                            underRenovation ? 'opacity-60' : ''
                          }`}
                        >
                          {room.image && (
                            <img
                              src={room.image}
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
                          <div className={`min-w-0 ${underRenovation ? 'opacity-60' : ''}`}>
                            <h2 className="text-base font-medium text-gray-900">
                              {room.name}
                              {showsCode(room) && (
                                <span className="ml-2 whitespace-nowrap font-normal tabular-nums text-gray-500">
                                  {room.facilityId}
                                </span>
                              )}
                            </h2>
                            <p className="mt-1 text-sm tabular-nums text-gray-500">
                              {capacityLabel(room)}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {underRenovation ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
                                {ROOM_STATUS_LABEL[toRoomStatus(room.status)]}
                              </span>
                            ) : (
                              <Button
                                className="bg-orange-600 text-white hover:bg-orange-700 hover:cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void router.push(`/booking?labId=${room.id}`);
                                }}
                              >
                                Book
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </div>
      </div>

      {openRoom?.image && (
        <PhotoLightbox
          src={openRoom.image}
          alt={`Room ${openRoom.name}`}
          caption={showsCode(openRoom) ? `${openRoom.name} (${openRoom.facilityId})` : openRoom.name}
          originEl={previewOrigin}
          onClose={closePreview}
        />
      )}
    </>
  );
}
