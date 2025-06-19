import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Search, Info, XCircle } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { api } from '~/utils/api';
import Head from 'next/head';

// Define booking type
type Booking = {
  id: string;
  date: string;
  time: string;
  room: string;
  status: string;
  eventName: string;
};

export default function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  // Table state for current bookings
  const [currentEntriesCount, setCurrentEntriesCount] = useState(10);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Table state for completed bookings
  const [completedEntriesCount, setCompletedEntriesCount] = useState(10);
  const [completedSearchTerm, setCompletedSearchTerm] = useState("");
  const [completedPage, setCompletedPage] = useState(1);
  
  // Mock data for completed bookings (replace with actual API call)
  const completedBookings = [
    {
      id: "1",
      date: "28 Juni 2025",
      time: "10:00",
      room: "B339",
      status: "Accepted",
      eventName: "Tugas UAS"
    },
    {
      id: "2",
      date: "26 Juni 2025",
      time: "16:00",
      room: "B357",
      status: "Accepted",
      eventName: "Rapat HM"
    }
  ];

  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Filter bookings based on search term
  const filteredCompleted = completedBookings.filter(booking => 
    booking.eventName.toLowerCase().includes(completedSearchTerm.toLowerCase()) ||
    booking.room.toLowerCase().includes(completedSearchTerm.toLowerCase())
  );

  // Only render content client-side to avoid hydration mismatch
  if (!isMounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <Head>
        <title>Dashboard</title>
        <meta name="description" content="Manage your room bookings" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Current Bookings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-700">
          <h2 className="text-3xl font-bold text-white">My Bookings</h2>
          <p className="text-blue-100 mt-2">Manage your current room bookings</p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span>Show</span>
              <select 
                className="border rounded px-2 py-1"
                value={currentEntriesCount}
                onChange={(e) => setCurrentEntriesCount(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            
            <div className="flex items-center">
              <label htmlFor="current-search" className="mr-2">Search:</label>
              <Input
                id="current-search"
                type="text"
                className="w-64"
                value={currentSearchTerm}
                onChange={(e) => setCurrentSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No data available in table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Showing 0 to 0 of 0 entries
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" disabled>Previous</Button>
              <Button variant="outline" disabled>Next</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Bookings Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800">
          <h2 className="text-3xl font-bold text-white">Completed Bookings</h2>
          <p className="text-blue-100 mt-2">View your past room bookings</p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span>Show</span>
              <select 
                className="border rounded px-2 py-1"
                value={completedEntriesCount}
                onChange={(e) => setCompletedEntriesCount(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            
            <div className="flex items-center">
              <label htmlFor="completed-search" className="mr-2">Search:</label>
              <Input
                id="completed-search"
                type="text"
                className="w-64"
                value={completedSearchTerm}
                onChange={(e) => setCompletedSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  filteredCompleted.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.date} at {booking.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.room}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-green-100 hover:bg-green-200 text-green-800 border-0">
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border-blue-200"
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 border-red-200"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Showing 1 to {filteredCompleted.length} of {filteredCompleted.length} entries
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" disabled={completedPage === 1}>Previous</Button>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700">1</Button>
              <Button variant="outline">Next</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}