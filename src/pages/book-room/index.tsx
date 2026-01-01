import { Building2, Users, ArrowRight } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function BookRoom() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Book Room - BookLab</title>
        <meta name="description" content="Book student labs or staff rooms at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 py-12 sm:py-16 mt-16 sm:mt-20 relative z-10">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 animate-fadeInUp">
            <div className="inline-block mb-4">
              <span className="text-orange-600 font-semibold text-xs sm:text-sm uppercase tracking-wider bg-orange-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
                Book Room
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
              Choose Room <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Category</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Select whether you want to book a student lab or a staff room
            </p>
          </div>

          {/* Room Type Selection */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* Students Lab */}
            <button
              onClick={() => router.push('/book-room/student-lab')}
              className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-blue-300 transform hover:-translate-y-1 cursor-pointer"
            >
              <div className="p-8 sm:p-10">
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* Icon */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="w-12 h-12 sm:w-14 sm:h-14 text-blue-600" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Students Lab
                  </h2>

                  {/* Description */}
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                    Book computer labs for student activities, group work, and academic events
                  </p>

                  {/* Action */}
                  <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                    Browse Labs
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>

            {/* Staff Room */}
            <button
              onClick={() => router.push('/book-room/staff-room')}
              className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-orange-300 transform hover:-translate-y-1 cursor-pointer"
            >
              <div className="p-8 sm:p-10">
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* Icon */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Building2 className="w-12 h-12 sm:w-14 sm:h-14 text-orange-600" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Staff Room
                  </h2>

                  {/* Description */}
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                    Book meeting rooms for staff activities
                  </p>

                  {/* Action */}
                  <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700 transition-colors">
                    Browse Rooms
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 sm:mt-16 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact Kelvin Wiriyatama for assistance with room bookings
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
