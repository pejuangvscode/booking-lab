/**
 * Single source of truth for rooms that are temporarily closed for renovation.
 *
 * These rooms are greyed out and cannot be booked while renovation is ongoing,
 * and a notice is shown on the landing page. To re-open a room once its
 * renovation is finished, simply remove its identifier from RENOVATION_ROOM_IDS.
 */

// Identifiers of rooms currently under renovation. Matching is done against both
// a room's facilityId and its name after normalization, so variations such as
// "F209-210" or "Paddock P208" are still detected.
export const RENOVATION_ROOM_IDS = ["F209", "F205", "PD208", "P208"] as const;

// Human-readable label used in user-facing notices.
export const RENOVATION_ROOM_LABEL = "F209, F205, dan PD208";

// Uppercase and strip everything except letters/numbers so that "F209-210",
// "Paddock P208", "pd 208", etc. all normalize to a comparable form.
const normalize = (value: string | null | undefined) =>
  (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Returns true when the given room is currently under renovation.
 */
export function isRoomUnderRenovation(room: {
  facilityId?: string | null;
  name?: string | null;
}): boolean {
  const haystack = `${normalize(room.facilityId)} ${normalize(room.name)}`;
  return RENOVATION_ROOM_IDS.some((id) => haystack.includes(normalize(id)));
}
