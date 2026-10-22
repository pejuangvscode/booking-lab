import { AdminRoomList } from "~/components/admin-room-list";

export default function AdminStaffRoomList() {
  return (
    <AdminRoomList
      roomType="staff_room"
      heading="Staff rooms"
      pageTitle="Staff Room - Book as Admin - BookLab"
      noun={{ one: "room", many: "rooms" }}
      bookButtonClass="bg-orange-600 hover:bg-orange-700"
    />
  );
}
