import { useState } from "react";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2, UserCheck, Users, X, UserPlus, Shield, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import Head from "next/head";
import { CustomDialog } from "~/components/ui/custom-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

type LabWithPIC = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image: string;
  pics: {
    id: string;
    name: string;
    role: string;
  }[];
};

type AdminUser = {
  id: string;
  name: string;
  role: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ManageAdminPage() {
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [selectedLabIds, setSelectedLabIds] = useState<string[]>([]);
  const [showLabSelection, setShowLabSelection] = useState(false);
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'alert';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'alert' = 'alert', onConfirm?: () => void) => {
    setDialog({ isOpen: true, title, message, type, onConfirm });
  };

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Fetch data
  const { data: labs, isLoading: labsLoading } = api.admin.getAccessibleLabs.useQuery() as {
    data: LabWithPIC[] | undefined;
    isLoading: boolean;
  };
  const { data: admins } = api.admin.getAdmins.useQuery() as {
    data: AdminUser[] | undefined;
    isLoading: boolean;
  };
  const { data: users, isLoading: usersLoading } = api.admin.getAllUsers.useQuery({
    search: userSearchQuery,
    limit: 50,
  }) as {
    data: User[] | undefined;
    isLoading: boolean;
  };

  // Mutations
  const setLabPICMutation = api.admin.setLabPIC.useMutation();
  const promoteToAdminMutation = api.admin.promoteToAdmin.useMutation();
  const utils = api.useUtils();

  const handleToggleLab = (labId: string) => {
    setSelectedLabIds(prev => 
      prev.includes(labId) 
        ? prev.filter(id => id !== labId)
        : [...prev, labId]
    );
  };

  const toggleExpandLab = (labId: string) => {
    setExpandedLabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(labId)) {
        newSet.delete(labId);
      } else {
        newSet.add(labId);
      }
      return newSet;
    });
  };

  const handleAssignAdmin = async () => {
    if (!selectedAdminId || selectedLabIds.length === 0) return;

    setIsProcessing(true);
    try {
      // Assign admin to multiple labs - add to existing PICs
      for (const labId of selectedLabIds) {
        const lab = labs?.find(l => l.id === labId);
        const currentPicIds = lab?.pics.map(pic => pic.id) ?? [];
        
        // Add the new PIC if not already assigned
        const newPicIds = currentPicIds.includes(selectedAdminId) 
          ? currentPicIds 
          : [...currentPicIds, selectedAdminId];

        await setLabPICMutation.mutateAsync({
          labId: labId,
          picIds: newPicIds,
        });
      }

      // Refresh data
      await utils.admin.getAccessibleLabs.invalidate();
      await utils.admin.getAdmins.invalidate();

      // Reset form
      setSelectedAdminId("");
      setSelectedLabIds([]);
      setShowLabSelection(false);

      showDialog(
        "Berhasil!",
        `Admin berhasil di-assign ke ${selectedLabIds.length} lab!`,
        "success"
      );
    } catch (error) {
      console.error("Error assigning admin:", error);
      showDialog(
        "Gagal!",
        "Gagal assign admin. Silakan coba lagi.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePIC = async (labId: string, picIdToRemove: string) => {
    setIsProcessing(true);
    try {
      const lab = labs?.find(l => l.id === labId);
      const currentPicIds = lab?.pics.map(pic => pic.id) ?? [];
      
      // Remove the specific PIC
      const newPicIds = currentPicIds.filter(id => id !== picIdToRemove);

      await setLabPICMutation.mutateAsync({
        labId,
        picIds: newPicIds,
      });

      // Refresh data
      await utils.admin.getAccessibleLabs.invalidate();

      showDialog(
        "Berhasil!",
        "PIC berhasil dihapus dari lab!",
        "success"
      );
    } catch (error) {
      console.error("Error removing PIC:", error);
      showDialog(
        "Gagal!",
        "Gagal menghapus PIC. Silakan coba lagi.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromoteUser = async () => {
    if (!selectedUserId) return;

    const user = users?.find(u => u.id === selectedUserId);
    if (!user) return;

    showDialog(
      "Konfirmasi Promote User",
      `Apakah Anda yakin ingin mengangkat ${user.name} menjadi admin?`,
      "alert",
      async () => {
        setIsProcessing(true);
        try {
          await promoteToAdminMutation.mutateAsync({
            userId: selectedUserId,
          });

          // Refresh data
          await utils.admin.getAllUsers.invalidate();
          await utils.admin.getAdmins.invalidate();

          // Reset selection
          setSelectedUserId("");

          showDialog(
            "Berhasil!",
            `${user.name} berhasil diangkat menjadi admin!`,
            "success"
          );
        } catch (error) {
          console.error("Error promoting user:", error);
          showDialog(
            "Gagal!",
            "Gagal mengangkat user menjadi admin. Silakan coba lagi.",
            "error"
          );
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  return (
    <>
      <Head>
        <title>Manage PIC - Admin Dashboard</title>
      </Head>
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 max-w-xs mx-4 border border-orange-100/50 animate-in zoom-in-95 duration-300">
            {/* Spinner with subtle glow */}
            <div className="relative">
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-orange-400/20 blur-xl"></div>
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-[3px] border-gray-100"></div>
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-orange-500 border-r-orange-400 animate-spin"></div>
              </div>
            </div>
            
            {/* Text */}
            <div className="text-center space-y-1.5">
              <p className="text-gray-800 font-semibold text-lg">Memproses</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-16 sm:mt-20 relative z-10">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent mb-3">
              Manage Admin & PIC
            </h1>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="promote" className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-3 mb-8 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="promote"
                className="hover:cursor-pointer relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-gray-600 bg-white border-2 border-gray-200 shadow-sm transition-all duration-300 hover:border-orange-300 hover:shadow-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:via-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-500 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-200/50 data-[state=active]:scale-[1.02]"
              >
                <span className="hidden sm:inline">Promote User</span>
                <span className="sm:hidden">Promote</span>
              </TabsTrigger>
              <TabsTrigger 
                value="assign"
                className="hover:cursor-pointer relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-gray-600 bg-white border-2 border-gray-200 shadow-sm transition-all duration-300 hover:border-orange-300 hover:shadow-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:via-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-500 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-200/50 data-[state=active]:scale-[1.02]"
              >
                <span className="hidden sm:inline">Assign PIC</span>
                <span className="sm:hidden">Assign</span>
              </TabsTrigger>
              <TabsTrigger 
                value="overview"
                className="hover:cursor-pointer relative flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-gray-600 bg-white border-2 border-gray-200 shadow-sm transition-all duration-300 hover:border-orange-300 hover:shadow-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:via-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-500 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-200/50 data-[state=active]:scale-[1.02]"
              >
                <span className="hidden sm:inline">Lab Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Promote User to Admin */}
            <TabsContent value="promote">
              <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-100 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 px-6 py-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    Promote User to Admin
                  </h2>
                  <p className="text-orange-50 text-sm mt-1">Angkat user menjadi admin</p>
                </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                {/* Select User */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select User
                  </label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full hover:cursor-pointer hover:border-orange-300 focus:ring-orange-200">
                      <SelectValue placeholder="Pilih user untuk diangkat menjadi admin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usersLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Loading users...
                        </div>
                      ) : users && users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="hover:cursor-pointer">
                            <div className="flex flex-col items-start">
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Tidak ada user yang bisa dipromote
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {selectedUserId && users && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      {(() => {
                        const selectedUser = users.find(user => user.id === selectedUserId);
                        return selectedUser ? (
                          <div className="text-sm">
                            <p className="font-semibold text-orange-900">{selectedUser.name}</p>
                            <p className="text-xs text-orange-700 mt-1">{selectedUser.email}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Promote Button */}
                <Button
                  onClick={handlePromoteUser}
                  disabled={!selectedUserId || isProcessing}
                  className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-white hover:cursor-pointer h-12 px-6 font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Promote to Admin
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Assign PIC */}
        <TabsContent value="assign">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 px-6 py-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Assign New PIC
              </h2>
              <p className="text-orange-50 text-sm mt-1">Assign admin sebagai PIC untuk lab</p>
            </div>
            
            <div className="p-6 sm:p-8 space-y-6">
              {/* Select Admin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Admin
                </label>
                <Select value={selectedAdminId} onValueChange={(value) => {
                  setSelectedAdminId(value);
                  setSelectedLabIds([]);
                }}>
                  <SelectTrigger className="w-full hover:cursor-pointer hover:border-orange-300 focus:ring-orange-200">
                    <SelectValue placeholder="Pilih admin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {admins?.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id} className="hover:cursor-pointer">
                        <div className="flex flex-col items-start">
                          <div className="font-medium">{admin.name}</div>
                          <div className="text-xs text-gray-500">
                            {admin.role} • Currently PIC for {labs?.filter(lab => lab.pics.some(pic => pic.id === admin.id)).length || 0} labs
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Labs */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Labs {selectedLabIds.length > 0 && <span className="text-orange-600">({selectedLabIds.length} selected)</span>}
                </label>
                <div className="border-2 border-gray-200 rounded-xl p-3 max-h-80 overflow-y-auto bg-gray-50">
                  <div className="space-y-2">
                    {labs?.map((lab) => {
                      const isSelected = selectedLabIds.includes(lab.id);
                      return (
                        <div key={lab.id} className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all hover:bg-white cursor-pointer ${isSelected ? 'bg-white border-orange-300 shadow-sm' : 'border-transparent'}`}>
                          <input
                            type="checkbox"
                            id={`lab-${lab.id}`}
                            checked={isSelected}
                            onChange={() => handleToggleLab(lab.id)}
                            className="mt-1 rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-400 focus:ring focus:ring-orange-200 focus:ring-opacity-50 hover:cursor-pointer"
                          />
                          <div className="flex-1 min-w-0" onClick={() => handleToggleLab(lab.id)}>
                            <div className="font-medium text-sm text-gray-900">{lab.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {lab.facilityId} • {lab.type}
                              {lab.pics.length > 0 && (
                                <span className="ml-2 text-orange-600 font-medium">
                                  • {lab.pics.length} PIC assigned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {selectedLabIds.length > 0 && (
                  <div className="mt-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="flex flex-wrap gap-2">
                      {selectedLabIds.map(labId => {
                        const lab = labs?.find(l => l.id === labId);
                        return lab ? (
                          <Badge key={labId} variant="secondary" className="text-xs bg-orange-100 text-orange-900 border border-orange-200 pr-1">
                            {lab.name}
                            <button
                              onClick={() => handleToggleLab(labId)}
                              className="ml-1 hover:bg-orange-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Assign Button */}
              <Button
                onClick={handleAssignAdmin}
                disabled={!selectedAdminId || selectedLabIds.length === 0 || isProcessing}
                className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 hover:from-orange-600 hover:via-orange-700 hover:to-orange-600 text-white hover:cursor-pointer text-sm sm:text-base h-12 font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Assign PIC {selectedLabIds.length > 0 && `(${selectedLabIds.length} labs)`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Lab Assignment Overview */}
        <TabsContent value="overview">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 px-6 py-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Lab Assignments Overview
              </h2>
              <p className="text-orange-50 text-sm mt-1">Detail lab dan PIC yang sudah di-assign. Klik card untuk melihat detail lengkap</p>
            </div>

            <div className="p-6">
              {labsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gray-200 flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
              ) : labs && labs.length > 0 ? (
                <div className="grid gap-3 sm:gap-4">
                  {labs.map((lab) => {
                const isExpanded = expandedLabs.has(lab.id);
                return (
                  <div
                    key={lab.id}
                    className="bg-white border-2 border-gray-200 rounded-xl hover:shadow-lg hover:border-orange-200 transition-all duration-200"
                  >
                    {/* Summary View - Always Visible */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpandLab(lab.id)}
                    >
                      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center">
                        {/* Lab Image */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 shadow-sm">
                          {lab.image ? (
                            <img 
                              src={lab.image} 
                              alt={lab.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                              <Users className="w-6 h-6 text-orange-600" />
                            </div>
                          )}
                        </div>
                        
                        {/* Lab Name & Facility ID */}
                        <div className="min-w-0 overflow-hidden">
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">{lab.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">{lab.facilityId}</p>
                        </div>

                        {/* PIC Badge */}
                        <div className="flex-shrink-0">
                          {lab.pics.length > 0 ? (
                            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 text-xs whitespace-nowrap">
                              {lab.pics.length} PIC{lab.pics.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-xs whitespace-nowrap">
                              No PIC
                            </Badge>
                          )}
                        </div>
                        
                        {/* Expand Button */}
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details - Only Visible When Expanded */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 space-y-4">
                        {/* Lab Details */}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Lab Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Department</span>
                              <p className="font-semibold text-gray-900 truncate">{lab.department}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Type</span>
                              <p className="font-semibold text-gray-900 truncate">{lab.type}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-500 block mb-0.5 text-[10px] sm:text-xs">Capacity</span>
                              <p className="font-semibold text-gray-900">{lab.capacity} orang</p>
                            </div>
                          </div>
                        </div>

                        {/* PIC List */}
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Person In Charge (PIC)</h4>
                          {lab.pics.length > 0 ? (
                            <div className="space-y-1.5">
                              {lab.pics.map((pic) => (
                                <div key={pic.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs text-gray-900 truncate">{pic.name}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePIC(lab.id, pic.id);
                                    }}
                                    disabled={isProcessing}
                                    className="hover:cursor-pointer text-red-600 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                              <p className="text-xs text-amber-700">Belum ada PIC yang di-assign</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              ) : (
                <Alert className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
                  <Users className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-800 font-medium">
                    Tidak ada lab yang tersedia atau Anda tidak memiliki akses untuk manage lab assignment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
        </div>
      </div>

      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
    </>
  );
}