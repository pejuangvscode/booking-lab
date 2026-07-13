import { ArrowLeft, Calendar, ChevronDown, MapPin, Search, Users, Wrench } from "lucide-react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { isRoomUnderRenovation } from "~/lib/renovation";

type Lab = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image?: string | null;
  roomType?: string;
};

export default function StudentLabList() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [openLabId, setOpenLabId] = useState<string | null>(null);

  const {
    data: labData = [],
    isLoading,
    error,
  } = api.lab.getStudentLabs.useQuery();

  const filteredData = labData.filter((lab: Lab) => {
    return (
      lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.facilityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <>
      <Head>
        <title>Students Lab - BookLab</title>
        <meta name="description" content="Browse and book student laboratories at UPH" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 pb-20 pt-24 sm:pt-28">
          {/* Back */}
          <button
            onClick={() => router.push('/book-room')}
            className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 hover:cursor-pointer"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to room selection
          </button>

          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight text-gray-900 sm:text-3xl">
              Student labs
            </h1>
            <p className="mt-2 text-base text-gray-500">
              Select a computer lab for your student activities.
            </p>
          </header>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or lab ID"
              className="h-11 rounded-xl border-gray-200 bg-white pl-10 text-base shadow-none focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 w-1/2 rounded bg-gray-100"></div>
                    <div className="h-4 w-2/3 rounded bg-gray-100"></div>
                    <div className="flex gap-2 pt-1">
                      <div className="h-6 w-20 rounded-md bg-gray-100"></div>
                      <div className="h-6 w-16 rounded-md bg-gray-100"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              Failed to load labs. Please try again later.
            </div>
          )}

          {/* List */}
          {!isLoading && !error && (
            filteredData.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-900">No labs found</p>
                <p className="mt-1 text-sm text-gray-500">Try a different search term.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredData.map((lab) => {
                  const isOpen = openLabId === lab.id;
                  const underRenovation = isRoomUnderRenovation(lab);
                  return (
                    <div
                      key={lab.id}
                      className={`overflow-hidden rounded-xl border transition-colors ${
                        underRenovation
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="flex cursor-pointer flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => setOpenLabId(isOpen ? null : lab.id)}
                      >
                        <div className={`min-w-0 ${underRenovation ? 'opacity-60' : ''}`}>
                          <h2 className="text-base font-medium text-gray-900">
                            {lab.name}
                          </h2>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {lab.department} &middot; {lab.facilityId}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                              <MapPin className="h-3 w-3" />
                              {lab.type}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                              <Users className="h-3 w-3" />
                              {lab.capacity} seats
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
                          {underRenovation ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
                              Under Construction
                            </span>
                          ) : (
                            <Button
                              className="bg-blue-600 text-white hover:bg-blue-700 hover:cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                void router.push(`/booking?labId=${lab.id}`);
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                              Book
                            </Button>
                          )}
                          <ChevronDown
                            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Expandable preview */}
                      <div
                        className={`grid transition-all duration-300 ease-out ${
                          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-gray-100 p-5">
                            {lab.image ? (
                              <img
                                src={lab.image}
                                alt={`Lab ${lab.name}`}
                                className="w-full rounded-lg border border-gray-100 object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/placeholder-lab.jpg";
                                }}
                              />
                            ) : (
                              <p className="text-sm text-gray-400">No preview available.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
