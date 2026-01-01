import { ArrowLeft, Building2, Calendar, Loader2, MapPin, Search } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";

type Room = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image?: string | null;
  roomType?: string;
};

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

  const getCapacityColor = (capacity: number) => {
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  return (
    <>
      <Head>
        <title>Staff Room - BookLab</title>
        <meta name="description" content="Browse and book staff rooms at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 py-6 sm:py-8 mt-16 sm:mt-20 relative z-10">
          {/* Back Button */}
          <button
            onClick={() => router.push('/book-room')}
            className="mb-6 flex items-center text-orange-600 hover:text-orange-800 font-semibold transition-colors group hover:cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Room Selection
          </button>

          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fadeInUp">
            <div className="inline-block mb-4">
              <span className="text-orange-600 font-semibold text-xs sm:text-sm uppercase tracking-wider bg-orange-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
                Staff Room
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-3 sm:mb-4">
              Browse <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Staff Meeting Rooms</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Select a meeting room for staff activities
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-8 sm:mb-12 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Search rooms by name or ID..."
                className="pl-12 sm:pl-14 pr-4 py-4 sm:py-5 w-full text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-400/20 focus:border-orange-400 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Loading State - Skeleton */}
          {isLoading && (
            <div className="space-y-4 sm:space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-6 sm:p-8 animate-pulse"
                >
                  <div className="flex items-center">
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                        <div className="flex-grow space-y-3">
                          {/* Title skeleton */}
                          <div className="h-7 bg-gray-200 rounded-lg w-3/4"></div>
                          {/* Subtitle skeleton */}
                          <div className="h-5 bg-gray-200 rounded-lg w-1/2"></div>
                          {/* Badges skeleton */}
                          <div className="flex gap-3 mt-4">
                            <div className="h-7 bg-gray-200 rounded-full w-24"></div>
                            <div className="h-7 bg-gray-200 rounded-full w-28"></div>
                          </div>
                        </div>
                        {/* Button skeleton */}
                        <div className="mt-4 sm:mt-0 sm:ml-6">
                          <div className="h-11 bg-gray-200 rounded-xl w-32"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="bg-red-50 rounded-3xl p-8 border-2 border-red-200 max-w-md mx-auto">
                <p className="text-red-700 font-semibold">Failed to load rooms. Please try again later.</p>
              </div>
            </div>
          )}

          {/* Rooms List */}
          {!isLoading && !error && (
            <div className="space-y-6">
              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 border-2 border-orange-200 max-w-md mx-auto shadow-2xl">
                    <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Rooms Found</h3>
                    <p className="text-base text-gray-600">Try adjusting your search criteria</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {filteredData.map((room, index) => (
                    <div
                      key={room.id}
                      className="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-orange-400 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl shadow-lg cursor-pointer overflow-hidden"
                      onClick={() => setOpenRoomId(openRoomId === room.id ? null : room.id)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                      <div className="flex items-center p-6 sm:p-8 relative z-10">
                        <div className="flex-grow">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                            <div className="flex-grow">
                              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                                {room.name}
                              </h3>
                              <p className="text-gray-600 text-sm sm:text-base mb-4 leading-relaxed">
                                {room.department} • Room ID: {room.facilityId}
                              </p>

                              <div className="flex flex-wrap gap-2 sm:gap-3">
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs sm:text-sm px-3 py-1">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {room.type}
                                </Badge>
                                <Badge className={`${getCapacityColor(room.capacity)} text-xs sm:text-sm px-3 py-1`}>
                                  {room.capacity} seats
                                </Badge>
                              </div>
                            </div>

                            {/* Book Button */}
                            <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0">
                              <Button
                                className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-6 sm:px-8 py-3 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 border-0 group/btn cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/booking?labId=${room.id}`);
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                                <span className="flex items-center relative z-10">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Book Now
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Room Image */}
                      <div
                        className={`overflow-hidden transition-all duration-500 bg-gradient-to-br from-gray-50 to-gray-100 border-t-2 px-4 sm:px-6 border-gray-200 ${
                          openRoomId === room.id ? "max-h-[600px] py-6 sm:py-8 opacity-100" : "max-h-0 py-0 opacity-0"
                        } flex justify-center items-center`}
                      >
                        {room.image && (
                          <div className="relative group/img">
                            <img
                              src={room.image}
                              alt={`Room ${room.name}`}
                              className="w-full rounded-2xl max-w-2xl shadow-2xl object-cover border-4 border-white group-hover/img:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/placeholder-room.jpg";
                              }}
                            />
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
