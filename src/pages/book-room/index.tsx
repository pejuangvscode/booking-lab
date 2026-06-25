import { Building2, Users, ArrowRight } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";

const categories = [
  {
    key: "student",
    title: "Students Lab",
    description:
      "Computer labs for student activities, group work, and academic events.",
    cta: "Browse labs",
    href: "/book-room/student-lab",
    icon: Users,
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    hoverBorder: "hover:border-blue-300",
    link: "text-blue-600",
  },
  {
    key: "staff",
    title: "Staff Room",
    description: "Meeting rooms for staff activities and discussions.",
    cta: "Browse rooms",
    href: "/book-room/staff-room",
    icon: Building2,
    iconBg: "bg-orange-50",
    iconText: "text-orange-600",
    hoverBorder: "hover:border-orange-300",
    link: "text-orange-600",
  },
];

export default function BookRoom() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Book Room - BookLab</title>
        <meta name="description" content="Book student labs or staff rooms at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 sm:pt-32">
          {/* Header */}
          <header className="mb-10 sm:mb-12">
            <p className="text-sm font-medium text-gray-400">Book a room</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl">
              Choose a category
            </h1>
          </header>

          {/* Categories */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.key}
                  onClick={() => router.push(category.href)}
                  className={`group flex h-full flex-col items-start rounded-2xl border border-gray-200 bg-white p-7 text-left transition-colors hover:bg-gray-50/60 ${category.hoverBorder}`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${category.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${category.iconText}`} />
                  </span>
                  <h2 className="mt-5 text-lg font-medium text-gray-900">
                    {category.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {category.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Help */}
          <p className="mt-10 text-sm text-gray-400">
            Need help? Contact Kelvin Wiriyatama for assistance with room bookings.
          </p>
        </div>
      </div>
    </>
  );
}
