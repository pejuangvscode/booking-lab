import { AdminRoomList } from "~/components/admin-room-list";

export default function AdminStudentLabList() {
  return (
    <AdminRoomList
      roomType="student_lab"
      heading="Student labs"
      pageTitle="Students Lab - Book as Admin - BookLab"
      noun={{ one: "lab", many: "labs" }}
      bookButtonClass="bg-blue-600 hover:bg-blue-700"
    />
  );
}
