import { useState } from "react";
import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2, UserCheck, Users } from "lucide-react";

type LabWithPIC = {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image: string;
  pic?: {
    id: string;
    name: string;
    role: string;
  } | null;
};

type AdminUser = {
  id: string;
  name: string;
  role: string;
};

export default function ManageAdminPage() {
  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");

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

  const handleAssignAdmin = async () => {
    if (!selectedLabId || !selectedAdminId) return;

    try {
      await setLabPICMutation.mutateAsync({
        labId: selectedLabId,
        picId: selectedAdminId,
      });

      // Refresh data
      await utils.admin.getAccessibleLabs.invalidate();
      await utils.admin.getAdmins.invalidate();

      // Reset form
      setSelectedLabId("");
      setSelectedAdminId("");

      alert("Admin berhasil di-assign ke lab!");
    } catch (error) {
      console.error("Error assigning admin:", error);
      alert("Gagal assign admin. Silakan coba lagi.");
    }
  };

  const handleRemovePIC = async (labId: string) => {
    try {
      await setLabPICMutation.mutateAsync({
        labId,
        picId: null,
      });

      // Refresh data
      await utils.admin.getAccessibleLabs.invalidate();

      alert("PIC berhasil dihapus dari lab!");
    } catch (error) {
      console.error("Error removing PIC:", error);
      alert("Gagal menghapus PIC. Silakan coba lagi.");
    }
  };

  return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mt-15 font-bold text-gray-900 mb-2">Manage PIC</h1>
          <p className="text-gray-600">Assign admin sebagai PIC (Person In Charge) untuk setiap lab</p>
        </div>

        {/* Assign Admin Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Assign Admin ke Lab
            </CardTitle>
            <CardDescription>
              Pilih lab dan admin yang akan di-assign sebagai PIC untuk lab tersebut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Lab
                </label>
                <Select value={selectedLabId} onValueChange={setSelectedLabId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lab..." />
                  </SelectTrigger>
                  <SelectContent>
                    {labs?.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name} ({lab.facilityId})
                        {/* {lab.pic && (
                          <Badge variant="secondary" className="ml-2">
                            PIC: {lab.pic.role}
                          </Badge>
                        )} */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Admin
                </label>
                <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih admin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {admins?.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name} ({admin.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAssignAdmin}
              disabled={!selectedLabId || !selectedAdminId || setLabPICMutation.isPending}
              className="w-full md:w-auto"
            >
              {setLabPICMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Assign Admin
            </Button>
          </CardContent>
        </Card>

        {/* Current Lab Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lab Assignments
            </CardTitle>
            <CardDescription>
              Daftar lab dan PIC yang sudah di-assign
            </CardDescription>
          </CardHeader>
          <CardContent>
            {labsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : labs && labs.length > 0 ? (
              <div className="space-y-4">
                {labs.map((lab) => (
                  <div
                    key={lab.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{lab.name}</h3>
                      <p className="text-sm text-gray-500">
                        Facility ID: {lab.facilityId} | Type: {lab.type}
                      </p>
                      {lab.pic ? (
                        <div className="mt-2">
                          <Badge variant="default">
                            PIC: {lab.pic.name} ({lab.pic.role})
                          </Badge>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Badge variant="outline">Belum ada PIC</Badge>
                        </div>
                      )}
                    </div>
                    {lab.pic && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePIC(lab.id)}
                        disabled={setLabPICMutation.isPending}
                      >
                        Hapus PIC
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Tidak ada lab yang tersedia atau Anda tidak memiliki akses.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
  );
}