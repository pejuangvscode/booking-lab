import { useState } from "react";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2, UserCheck, Users, X } from "lucide-react";
import Head from "next/head";
import { CustomDialog } from "~/components/ui/custom-dialog";

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

export default function ManageAdminPage() {
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [selectedLabIds, setSelectedLabIds] = useState<string[]>([]);
  const [showLabSelection, setShowLabSelection] = useState(false);
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

  // Mutations
  const setLabPICMutation = api.admin.setLabPIC.useMutation();
  const utils = api.useUtils();

  const handleToggleLab = (labId: string) => {
    setSelectedLabIds(prev => 
      prev.includes(labId) 
        ? prev.filter(id => id !== labId)
        : [...prev, labId]
    );
  };

  const handleAssignAdmin = async () => {
    if (!selectedAdminId || selectedLabIds.length === 0) return;

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
    }
  };

  const handleRemovePIC = async (labId: string, picIdToRemove: string) => {
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
    }
  };

  return (
    <>
      <Head>
        <title>Manage PIC - Admin Dashboard</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mt-15 font-bold text-gray-900 mb-2">Manage PIC</h1>
          <p className="text-gray-600">Assign admin sebagai PIC (Person In Charge) untuk setiap lab</p>
        </div>

        {/* Assign Admin Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Step 1: Select Admin */}
          <Card className={`transition-all duration-200 ${selectedAdminId ? 'border-gray-400 shadow-sm' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-6 h-6 rounded-full bg-gray-600 text-white text-sm flex items-center justify-center font-semibold">1</div>
                Pilih Admin/PIC
              </CardTitle>
              <CardDescription>
                Pilih admin yang akan di-assign sebagai PIC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedAdminId} onValueChange={(value) => {
                setSelectedAdminId(value);
                setShowLabSelection(!!value);
                setSelectedLabIds([]);
              }}>
                <SelectTrigger className="w-full hover: cursor-pointer">
                  <SelectValue placeholder="Pilih admin..." />
                </SelectTrigger>
                <SelectContent>
                  {admins?.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id} className="hover: cursor-pointer">
                      <div className="flex flex-col items-start">
                        <div className="font-medium">{admin.name}</div>
                        <div className="text-xs text-gray-500">
                          {admin.role}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedAdminId && admins && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                  {(() => {
                    const selectedAdmin = admins.find(admin => admin.id === selectedAdminId);
                    return selectedAdmin ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                          <span className="font-medium text-sm">Admin Terpilih</span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <p className="font-medium">{selectedAdmin.name}</p>
                          <p className="text-xs text-gray-500">
                            Role: {selectedAdmin.role}
                          </p>
                          {labs && (
                            <p className="text-xs text-gray-600 mt-1">
                              Currently PIC for: {labs.filter(lab => lab.pics.some(pic => pic.id === selectedAdmin.id)).length} labs
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Labs */}
          <Card className={`transition-all duration-200 ${showLabSelection ? selectedLabIds.length > 0 ? 'border-gray-500 shadow-sm' : 'border-gray-400 shadow-sm' : 'opacity-50'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={`w-6 h-6 rounded-full ${showLabSelection ? 'bg-gray-600' : 'bg-gray-400'} text-white text-sm flex items-center justify-center font-semibold`}>2</div>
                Pilih Labs
              </CardTitle>
              <CardDescription>
                Pilih lab yang akan di-assign ke admin ({selectedLabIds.length} dipilih)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showLabSelection ? (
                <div className="space-y-3">
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-white">
                    <div className="space-y-3">
                      {labs?.map((lab) => {
                        const isSelected = selectedLabIds.includes(lab.id);
                        return (
                          <div key={lab.id} className={`flex items-start space-x-3 p-2 rounded-lg border transition-all hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-gray-50 border-gray-400' : 'border-gray-200'}`}>
                            <input
                              type="checkbox"
                              id={`lab-${lab.id}`}
                              checked={isSelected}
                              onChange={() => handleToggleLab(lab.id)}
                              className="mt-1 rounded border-gray-300 text-gray-600 shadow-sm focus:border-gray-400 focus:ring focus:ring-gray-200 focus:ring-opacity-50 hover: cursor-pointer"
                            />
                            <div className="flex-1 min-w-0" onClick={() => handleToggleLab(lab.id)}>
                              <div className="font-medium text-sm text-gray-900">{lab.name}</div>
                              <div className="text-xs text-gray-500">{lab.facilityId} • {lab.type}</div>
                              <div className="text-xs text-gray-500">
                                {lab.pics.length > 0 ? `${lab.pics.length} PIC${lab.pics.length > 1 ? 's' : ''} assigned` : 'No PIC assigned'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {selectedLabIds.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        <span className="font-medium text-sm">Labs Terpilih ({selectedLabIds.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedLabIds.map(labId => {
                          const lab = labs?.find(l => l.id === labId);
                          return lab ? (
                            <Badge key={labId} variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                              {lab.name}
                              <button
                                onClick={() => handleToggleLab(labId)}
                                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
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
              ) : (
                <div className="border rounded-lg p-6 text-center bg-gray-50">
                  <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">Pilih admin terlebih dahulu untuk memilih labs</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Confirm Assignment */}
          <Card className={`transition-all duration-200 ${selectedAdminId && selectedLabIds.length > 0 ? 'border-gray-500 shadow-sm' : 'opacity-50'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={`w-6 h-6 rounded-full ${selectedAdminId && selectedLabIds.length > 0 ? 'bg-gray-600' : 'bg-gray-400'} text-white text-sm flex items-center justify-center font-semibold`}>3</div>
                Konfirmasi
              </CardTitle>
              <CardDescription>
                Review dan konfirmasi assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAdminId && selectedLabIds.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 mb-2">Summary Assignment:</div>
                      <div className="space-y-1 text-gray-700">
                        <p><span className="font-medium">Admin:</span> {admins?.find(a => a.id === selectedAdminId)?.name}</p>
                        <p><span className="font-medium">Labs:</span> {selectedLabIds.length} labs</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleAssignAdmin}
                    disabled={setLabPICMutation.isPending}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white hover: cursor-pointer"
                  >
                    {setLabPICMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Assign to {selectedLabIds.length} Labs
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-6 text-center bg-gray-50">
                  <UserCheck className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm mb-1">Siap untuk assignment</p>
                  <p className="text-gray-400 text-xs">Pilih admin dan labs terlebih dahulu</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Lab Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lab Assignments Overview
            </CardTitle>
            <CardDescription>
              Detail lab dan PIC yang sudah di-assign dengan informasi lengkap
            </CardDescription>
          </CardHeader>
          <CardContent>
            {labsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Memuat data lab...</p>
                </div>
              </div>
            ) : labs && labs.length > 0 ? (
              <div className="grid gap-4">
                {labs.map((lab) => (
                  <div
                    key={lab.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Lab Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {lab.image ? (
                              <img 
                                src={lab.image} 
                                alt={lab.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">{lab.name}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Facility ID:</span>
                                <p className="font-medium text-gray-900">{lab.facilityId}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Department:</span>
                                <p className="font-medium text-gray-900">{lab.department}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Type:</span>
                                <p className="font-medium text-gray-900">{lab.type}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Capacity:</span>
                                <p className="font-medium text-gray-900">{lab.capacity} orang</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PIC Status */}
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                Person In Charge (PIC)
                              </h4>
                              {lab.pics.length > 0 ? (
                                <div className="space-y-2">
                                  {lab.pics.map((pic) => (
                                    <div key={pic.id} className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <UserCheck className="w-4 h-4 text-gray-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">{pic.name}</p>
                                        <p className="text-sm text-gray-500">{pic.role}</p>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemovePIC(lab.id, pic.id)}
                                        disabled={setLabPICMutation.isPending}
                                        className="hover:cursor-pointer text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                                      >
                                        {setLabPICMutation.isPending ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <X className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  ))}
                                  <Badge variant="default" className="bg-gray-100 text-gray-800 border-gray-300">
                                    ✓ {lab.pics.length} PIC{lab.pics.length > 1 ? 's' : ''} Assigned
                                  </Badge>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                      <Users className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-500">Belum ada PIC</p>
                                      <p className="text-sm text-gray-400">Lab ini memerlukan PIC assignment</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-gray-300 text-gray-600 bg-gray-50">
                                    Perlu Assignment
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Summary Stats */}
                {/* <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">Total Labs</p>
                        <p className="font-bold text-blue-900">{labs.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600">Labs dengan PIC</p>
                        <p className="font-bold text-green-900">{labs.filter(lab => lab.pic).length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-amber-600">Perlu Assignment</p>
                        <p className="font-bold text-amber-900">{labs.filter(lab => !lab.pic).length}</p>
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>
            ) : (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada lab yang tersedia atau Anda tidak memiliki akses untuk manage lab assignment.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
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