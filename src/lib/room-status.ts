/**
 * A room's availability, stored in `rooms.status` and set in Supabase
 * (see prisma/sql/add-room-status.sql). Shared by the server and the pages.
 *
 * - active: listed and bookable.
 * - under_construction: listed but greyed out; cannot be booked.
 * - not_available: hidden from room lists; cannot be booked.
 */
export const ROOM_STATUSES = ["active", "not_available", "under_construction"] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

// The database constraint only allows the three values; anything else (a row
// read before the column existed, say) is treated as active.
export const toRoomStatus = (value: string | null | undefined): RoomStatus =>
  ROOM_STATUSES.includes(value as RoomStatus) ? (value as RoomStatus) : "active";

/** Only active rooms take new bookings. */
export const isRoomBookable = (status: string | null | undefined) =>
  toRoomStatus(status) === "active";

/** Whether the room appears in room lists at all. */
export const isRoomListed = (status: string | null | undefined) =>
  toRoomStatus(status) !== "not_available";

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  active: "Available",
  not_available: "Not Available",
  under_construction: "Under Construction",
};

/** Shown in place of the booking form, and returned when a booking is refused. */
export const ROOM_UNAVAILABLE_NOTICE: Record<Exclude<RoomStatus, "active">, { title: string; body: string }> = {
  under_construction: {
    title: "Ruangan sedang direnovasi",
    body: "Ruangan ini untuk sementara tidak dapat dipesan karena sedang dalam masa renovasi.",
  },
  not_available: {
    title: "Ruangan tidak tersedia",
    body: "Ruangan ini sedang tidak tersedia untuk dipesan.",
  },
};
