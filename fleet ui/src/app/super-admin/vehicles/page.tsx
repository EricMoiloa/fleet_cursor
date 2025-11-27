'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

// ===== Types (UI and API mapping) =====
type ApiVehicle = {
  id: number;
  plate_number: string;
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  type?: string | null;
  capacity?: number | null;
  department_id?: number | null;
  odometer?: number | null;
  status?: 'available' | 'assigned' | 'in_maintenance' | 'inactive';
  ministry_id?: number | null;
};

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  ministryId?: string | null; // string id or null (unassigned)
  status?: string;
  odometer?: number;
};

type ApiMinistry = { id: number; name: string; description?: string | null };
type MinistryRow = { id: string; name: string };

// Map API → UI row
function vToRow(v: ApiVehicle): VehicleRow {
  return {
    id: String(v.id),
    make: v.make ?? '',
    model: v.model ?? '',
    licensePlate: v.plate_number,
    ministryId: v.ministry_id ? String(v.ministry_id) : null,
    status: v.status ?? 'available',
    odometer: v.odometer ?? 0,
  };
}

export default function SuperAdminVehiclesPage() {
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [ministries, setMinistries] = useState<MinistryRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit/assign dialog state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(null);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string>(''); // '' while closed, 'Unassigned' or ministryId when open

  // Add Vehicle dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newOdo, setNewOdo] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'available' | 'assigned' | 'in_maintenance' | 'inactive'>('available');
  const [newMinistryId, setNewMinistryId] = useState<string>('Unassigned');

  // ===== Loaders =====
  async function fetchMinistries() {
    try {
      const res = await apiGet<ApiMinistry[] | { data: ApiMinistry[] }>('/ministries');
      const list: ApiMinistry[] = Array.isArray(res) ? res : Array.isArray((res as any).data) ? (res as any).data : [];
      setMinistries(list.map((m) => ({ id: String(m.id), name: m.name })));
    } catch (e) {
      console.error('Failed to load ministries', e);
      setMinistries([]);
    }
  }

  async function fetchVehicles() {
    try {
      const res = await apiGet<ApiVehicle[]>('/vehicles');
      setVehicles(res.map(vToRow));
    } catch (e) {
      console.error('Failed to load vehicles', e);
      setVehicles([]);
    }
  }

  useEffect(() => {
    fetchMinistries();
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== UI helpers =====
  const ministryById = useMemo(() => {
    const map = new Map<string, string>();
    ministries.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [ministries]);

  function getMinistryBadge(ministryId?: string | null) {
    if (!ministryId) return <Badge variant="outline">Unassigned</Badge>;
    const name = ministryById.get(ministryId);
    return name ? <Badge variant="secondary">{name}</Badge> : 'N/A';
  }

  // When opening edit dialog
  const handleOpenAssign = (v: VehicleRow) => {
    setSelectedVehicle(v);
    setSelectedMinistryId(v.ministryId ?? 'Unassigned');
  };

  // Save assignment via API
  const handleSaveAssign = async () => {
    if (!selectedVehicle) return;
    try {
      setLoading(true);
      const payload: Partial<ApiVehicle> = {
        ministry_id: selectedMinistryId === 'Unassigned' ? null : Number(selectedMinistryId),
      };
      await apiPut(`/vehicles/${selectedVehicle.id}`, payload);
      await fetchVehicles();
      toast({ title: 'Success', description: 'Vehicle assignment saved.' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setSelectedVehicle(null);
      setSelectedMinistryId('');
      setLoading(false);
    }
  };

  // “Retire” (set inactive) while editing
  const handleRetire = async () => {
    if (!selectedVehicle) return;
    try {
      setLoading(true);
      await apiPut(`/vehicles/${selectedVehicle.id}`, { status: 'inactive' });
      await fetchVehicles();
      toast({ title: 'Vehicle retired', description: 'Status set to inactive.' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setSelectedVehicle(null);
      setSelectedMinistryId('');
      setLoading(false);
    }
  };

  // Add vehicle (Super Admin)
  const handleAddVehicle = async () => {
    if (!newPlate.trim()) {
      toast({ title: 'Plate required', description: 'Please enter a license plate.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      await apiPost('/vehicles', {
        plate_number: newPlate.trim(),
        make: newMake.trim() || null,
        model: newModel.trim() || null,
        odometer: newOdo ? Number(newOdo) : 0,
        status: newStatus,
        ministry_id: newMinistryId === 'Unassigned' ? null : Number(newMinistryId),
      });
      await fetchVehicles();
      toast({ title: 'Vehicle added', description: 'The vehicle has been created.' });
      // reset
      setAddOpen(false);
      setNewPlate('');
      setNewMake('');
      setNewModel('');
      setNewOdo('');
      setNewStatus('available');
      setNewMinistryId('Unassigned');
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Vehicle Assignments</h1>

        {/* Add Vehicle (Super Admin) */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plate" className="text-right">License Plate</Label>
                <Input id="plate" className="col-span-3" value={newPlate} onChange={(e) => setNewPlate(e.target.value)} disabled={loading} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="make" className="text-right">Make</Label>
                <Input id="make" className="col-span-3" value={newMake} onChange={(e) => setNewMake(e.target.value)} disabled={loading} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">Model</Label>
                <Input id="model" className="col-span-3" value={newModel} onChange={(e) => setNewModel(e.target.value)} disabled={loading} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="odo" className="text-right">Odometer</Label>
                <Input id="odo" type="number" className="col-span-3" value={newOdo} onChange={(e) => setNewOdo(e.target.value)} disabled={loading} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Status</Label>
                <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_maintenance">In Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Ministry</Label>
                <Select value={newMinistryId} onValueChange={setNewMinistryId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    {ministries.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={loading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddVehicle} disabled={loading || !newPlate.trim()}>
                Save Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Vehicles to Ministries</CardTitle>
          <CardDescription>Allocate vehicles from the central pool to specific ministries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Ministry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    {vehicle.make} {vehicle.model}
                  </TableCell>
                  <TableCell>{vehicle.licensePlate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{vehicle.status}</Badge>
                  </TableCell>
                  <TableCell>{getMinistryBadge(vehicle.ministryId)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      onOpenChange={(isOpen) => {
                        if (!isOpen) {
                          setSelectedVehicle(null);
                          setSelectedMinistryId('');
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenAssign(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Vehicle</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div>
                            <p className="font-semibold">
                              {selectedVehicle?.make} {selectedVehicle?.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedVehicle?.licensePlate}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ministry">Ministry</Label>
                            <Select
                              value={selectedMinistryId || 'Unassigned'}
                              onValueChange={setSelectedMinistryId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a ministry" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                                {ministries.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter className="flex gap-2">
                          <DialogClose asChild>
                            <Button variant="outline" disabled={loading}>
                              Cancel
                            </Button>
                          </DialogClose>
                          {/* “Retire” instead of hard delete */}
                          <Button
                            variant="outline"
                            onClick={handleRetire}
                            disabled={loading || !selectedVehicle}
                          >
                            Set Inactive
                          </Button>
                          <DialogClose asChild>
                            <Button onClick={handleSaveAssign} disabled={loading || !selectedVehicle}>
                              Save Assignment
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}

              {vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No vehicles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
