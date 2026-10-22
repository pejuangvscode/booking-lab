import Head from "next/head";
import { useRouter } from "next/router";
import { StaffRoomArt, StudentLabArt } from "~/components/room-category-art";

// Same two categories as the user-facing /book-room, but each opens the admin
// list, where booking routes by super-admin and PIC status.
const categories = [
  {
    key: "student",
    title: "Students Lab",
    description:
      "Computer labs for student activities, group work, and academic events.",
    href: "/admin/lab-search/student-lab",
    Art: StudentLabArt,
    hoverBorder: "hover:border-blue-300",
  },
  {
    key: "staff",
    title: "Staff Room",
    description: "Meeting rooms for staff activities and discussions.",
    href: "/admin/lab-search/staff-room",
    Art: StaffRoomArt,
    hoverBorder: "hover:border-orange-300",
  },
];

export default function AdminLabSearch() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Book as Admin - BookLab</title>
        <meta name="description" content="Search and book available laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 sm:pt-32">
          <header className="mb-10 sm:mb-12">
            <h1 className="text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl">
              Choose a category
            </h1>
            <p className="mt-2 text-base text-gray-500">Book as admin</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {categories.map(({ key, title, description, href, Art, hoverBorder }) => (
              <button
                key={key}
                onClick={() => router.push(href)}
                className={`group hover:cursor-pointer flex h-full flex-col items-start rounded-2xl border border-gray-200 bg-white p-7 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gray-400/50 ${hoverBorder}`}
              >
                <Art className="h-24 w-[7.5rem]" />
                <h2 className="mt-5 text-lg font-medium text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
