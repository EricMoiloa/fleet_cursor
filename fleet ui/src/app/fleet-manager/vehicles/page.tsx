'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, User } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Vehicle, VehicleStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useVehiclesStore } from '@/lib/store/vehicles-store';
import { apiGet, apiPost } from '@/lib/apiClient';

/* --------------------------- Helpers & types --------------------------- */

type DriverLite = { id: string; name: string; email: string };

/** Map backend status -> UI status union */
function apiToUiStatus(s?: string | null): VehicleStatus {
  const v = String(s ?? '').toLowerCase();
  if (v === 'available') return 'Available';
  if (v === 'assigned') return 'Assigned';
  if (v === 'in_maintenance') return 'Maintenance';
  return 'Unavailable';
}

/** Map UI status -> backend enum */
function uiToApiStatus(s?: VehicleStatus): 'available' | 'assigned' | 'in_maintenance' | 'inactive' {
  switch (s) {
    case 'Available': return 'available';
    case 'Assigned': return 'assigned';
    case 'Maintenance': return 'in_maintenance';
    default: return 'inactive';
  }
}

/* ------------------------------- Component ------------------------------ */

export default function VehiclesPage() {
  const { toast } = useToast();

  const {
    vehicles, setVehicles, addVehicle, updateVehicle, removeVehicle,
  } = useVehiclesStore();

  const [isNew, setIsNew] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [assignDriverVehicle, setAssignDriverVehicle] = useState<Vehicle | null>(null);

  // current driver id per vehicle (we keep it locally because Vehicle type doesn’t have it)
  const [vehDriver, setVehDriver] = useState<Record<string, string>>({});

  // Select value MUST NOT be "", so use undefined for “no selection”
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>(undefined);
  const [drivers, setDrivers] = useState<DriverLite[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  /** Load vehicles from backend and normalize into store Vehicle type */
  async function loadVehicles() {
    try {
      const list = await apiGet<any[]>('/vehicles');
      const mapped: Vehicle[] = (list || []).map((v: any) => ({
        id: String(v.id),
        make: v.make ?? '',
        model: v.model ?? '',
        year: v.year ?? undefined,
        plate_number: v.plate_number ?? '',
        status: apiToUiStatus(v.status),
        department_id: v.department_id ?? null,
      }));

      // Capture current driver id per vehicle if present
      const driverMap: Record<string, string> = {};
      (list || []).forEach((v: any) => {
        if (v.current_driver_id) driverMap[String(v.id)] = String(v.current_driver_id);
      });

      setVehicles(mapped);
      setVehDriver(driverMap);
    } catch (e: any) {
      console.warn('Vehicles GET failed:', e?.message || e);
    }
  }

  // ---------- Load on mount ----------
  useEffect(() => {
    void loadVehicles();
  }, []);

  // ---------- Load Drivers (for the current ministry) ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingDrivers(true);
      try {
        const list = await apiGet<any[]>('/users?role=Driver');
        const mapped: DriverLite[] = (list || []).map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
        }));
        if (mounted) setDrivers(mapped);
      } catch (e: any) {
        console.warn('Drivers GET failed:', e?.message || e);
        if (mounted) setDrivers([]);
      } finally {
        setLoadingDrivers(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleOpenDialog = (vehicle: Vehicle | null) => {
    if (vehicle) {
      setIsNew(false);
      setCurrentVehicle(vehicle);
      setFormData(vehicle);
    } else {
      setIsNew(true);
      setCurrentVehicle(null);
      setFormData({
        status: 'Available',
        year: new Date().getFullYear(),
      });
    }
  };

  const handleSave = () => {
    // Local/store create or edit only (backend create allowed for Ministry Admin; keep simple here)
    if (isNew) {
      const newVehicle: Vehicle = {
        id: `veh-${Date.now()}`,
        make: formData.make || '',
        model: formData.model || '',
        year: formData.year ?? new Date().getFullYear(),
        plate_number: formData.plate_number || '',
        status: (formData.status as VehicleStatus) || 'Available',
        department_id: formData.department_id ?? null,
      };
      addVehicle(newVehicle);
      toast({ title: 'Success', description: 'Vehicle registered (local).' });
    } else if (currentVehicle) {
      updateVehicle(currentVehicle.id, formData);
      toast({ title: 'Success', description: 'Vehicle updated (local).' });
    }
    setCurrentVehicle(null);
    setFormData({});
  };

  // ---------- Assign / Unassign driver ----------
  const handleAssignDriver = async () => {
    if (!assignDriverVehicle) return;
    const v = assignDriverVehicle;

    const isUnassign = selectedDriverId === '__unset__' || !selectedDriverId;
    const driverIdForApi = isUnassign ? null : Number(selectedDriverId);

    const prevDriverId = vehDriver[v.id];
    const prevStatus = v.status;

    // optimistic UI
    setVehDriver((m) => ({ ...m, [v.id]: isUnassign ? '' : String(driverIdForApi) }));
    updateVehicle(v.id, { status: isUnassign ? 'Available' : 'Assigned' });

    try {
      await apiPost(`/vehicles/${encodeURIComponent(v.id)}/assign-driver`, {
        driver_id: driverIdForApi, // null for unassign ✅
      });

      const drv = drivers.find((d) => d.id === selectedDriverId);
      toast({
        title: isUnassign ? 'Driver unassigned' : 'Driver assigned',
        description: isUnassign
          ? `${v.make ?? ''} ${v.model ?? ''} is now available`
          : `${drv?.name ?? 'Driver'} → ${v.make ?? ''} ${v.model ?? ''}`,
      });
    } catch (e: any) {
      // rollback on fail
      setVehDriver((m) => ({ ...m, [v.id]: prevDriverId ?? '' }));
      updateVehicle(v.id, { status: prevStatus });
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: e?.message || 'Could not assign driver.',
      });
      return;
    } finally {
      setAssignDriverVehicle(null);
      setSelectedDriverId(undefined);
      await loadVehicles();
    }
  };

  const handleDelete = async (vehicleId: string) => {
    // Store-only removal (wire DELETE if/when you add backend permission)
    removeVehicle(vehicleId);
    toast({
      title: 'Removed',
      description: 'Vehicle has been removed from the list.',
      variant: 'destructive',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]:
        id === 'year' || id === 'department_id'
          ? (value ? Number(value) : undefined)
          : value,
    }));
  };

  const getDriverName = (vehicleId: string) => {
    const drvId = vehDriver[vehicleId];
    if (!drvId) return <span className="text-muted-foreground">N/A</span>;
    return drivers.find((u) => u.id === drvId)?.name || 'Unknown';
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Vehicle Management</h1>

        <Dialog onOpenChange={(isOpen) => { if (!isOpen) setCurrentVehicle(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Register Vehicle
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isNew ? 'Register New Vehicle' : 'Edit Vehicle'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input id="make" value={formData.make || ''} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" value={formData.model || ''} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" type="number" value={formData.year ?? ''} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate_number">Plate Number</Label>
                  <Input id="plate_number" value={formData.plate_number || ''} onChange={handleChange} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <DialogClose asChild><Button onClick={handleSave}>Save</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Vehicles</CardTitle>
          <CardDescription>Register, view, and manage all vehicles in the fleet.</CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Driver</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    {vehicle.make} {vehicle.model}
                  </TableCell>
                  <TableCell>{vehicle.plate_number}</TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        vehicle.status === 'Available'
                          ? 'secondary'
                          : vehicle.status === 'Maintenance'
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {vehicle.status}
                    </Badge>
                  </TableCell>

                  <TableCell>{getDriverName(vehicle.id)}</TableCell>

                  <TableCell className="text-right">
                    {/* Assign driver */}
                    <Dialog
                      onOpenChange={(open) => {
                        if (!open) {
                          setAssignDriverVehicle(null);
                          setSelectedDriverId(undefined);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAssignDriverVehicle(vehicle);
                            const current = vehDriver[vehicle.id];
                            setSelectedDriverId(current ? String(current) : undefined);
                          }}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Assign Driver to {vehicle.make} {vehicle.model}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="py-4 space-y-2">
                          <Label>Driver</Label>
                          <Select
                            value={selectedDriverId ?? undefined}     // never ""
                            onValueChange={(v) => setSelectedDriverId(v)}
                            disabled={loadingDrivers}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingDrivers ? 'Loading…' : 'Select a driver (or Unassign)'} />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Use sentinel value to avoid empty-string error */}
                              <SelectItem value="__unset__">{'(Unassign)'}</SelectItem>
                              {drivers.length === 0 && (
                                <SelectItem value="__none__" disabled>
                                  {loadingDrivers ? 'Loading…' : 'No drivers found'}
                                </SelectItem>
                              )}
                              {drivers.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <DialogFooter>
                          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                          <DialogClose asChild>
                            <Button
                              onClick={handleAssignDriver}
                              disabled={
                                selectedDriverId === '__none__' ||
                                selectedDriverId === undefined
                              }
                            >
                              {selectedDriverId === '__unset__' ? 'Unassign' : 'Assign'}
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Edit (local) */}
                    <Dialog onOpenChange={(isOpen) => !isOpen && setCurrentVehicle(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(vehicle)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogHeader><DialogTitle>Edit Vehicle</DialogTitle></DialogHeader>

                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="make">Make</Label>
                              <Input id="make" value={formData.make || ''} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="model">Model</Label>
                              <Input id="model" value={formData.model || ''} onChange={handleChange} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="year">Year</Label>
                              <Input id="year" type="number" value={formData.year ?? ''} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="plate_number">Plate Number</Label>
                              <Input id="plate_number" value={formData.plate_number || ''} onChange={handleChange} />
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                          <DialogClose asChild><Button onClick={handleSave}>Save</Button></DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Delete (store-only) */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the vehicle from the local list.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
