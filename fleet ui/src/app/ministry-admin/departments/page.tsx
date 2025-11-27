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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Car, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

const DEPTS_BASE = '/ministry/departments';

type ApiDepartment = { id: number; name: string };
type ApiVehicle = {
  id: number;
  plate_number: string;
  make?: string | null;
  model?: string | null;
  department_id?: number | null;
  ministry_id?: number | null;
};

type Department = {
  id: string;
  name: string;
  vehicles?: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  }[];
};

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  departmentId?: string | null;
};

export default function DepartmentsPage() {
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(false);

  // dialog state
  const [isNew, setIsNew] = useState(false);
  const [currentDept, setCurrentDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');

  // assign vehicle state
  const [vehicleToAssign, setVehicleToAssign] = useState<string>('');

  // ---- data fetchers --------------------------------------------------------
  async function fetchDepartments() {
    try {
      const res = await apiGet<ApiDepartment[] | { data: ApiDepartment[] }>(DEPTS_BASE);
      const list: ApiDepartment[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setDepartments(list.map((d) => ({ id: String(d.id), name: d.name, vehicles: [] })));
    } catch (e) {
      console.error('load departments failed', e);
      setDepartments([]);
    }
  }

  async function fetchVehicles() {
    try {
      const data = await apiGet<ApiVehicle[]>('/vehicles');
      setVehicles(
        data.map((v) => ({
          id: String(v.id),
          make: v.make ?? '',
          model: v.model ?? '',
          licensePlate: v.plate_number,
          departmentId: v.department_id ? String(v.department_id) : null,
        }))
      );
    } catch (e) {
      console.error('load vehicles failed', e);
      setVehicles([]);
    }
  }

  // join vehicles into departments
  const departmentsWithVehicles = useMemo(() => {
    const byDept = new Map<string, VehicleRow[]>();
    vehicles.forEach((v) => {
      const key = v.departmentId ?? 'none';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key)!.push(v);
    });

    return departments.map((d) => ({
      ...d,
      vehicles: (byDept.get(d.id) ?? []).map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        licensePlate: v.licensePlate,
      })),
    }));
  }, [departments, vehicles]);

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => !v.departmentId),
    [vehicles]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchDepartments(), fetchVehicles()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- helpers --------------------------------------------------------------
  async function handleSaveDepartment() {
    if (!deptName.trim()) return;

    try {
      setLoading(true);
      if (isNew) {
        await apiPost(DEPTS_BASE, { name: deptName.trim() });
        toast({ title: 'Department created' });
      } else if (currentDept) {
        await apiPut(`${DEPTS_BASE}/${currentDept.id}`, { name: deptName.trim() });
        toast({ title: 'Department updated' });
      }
      await fetchDepartments();
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setCurrentDept(null);
      setDeptName('');
      setLoading(false);
    }
  }

  async function handleDeleteDepartment(deptId: string) {
    try {
      setLoading(true);
      // raw fetch here because we just need DELETE
      await fetch(`/api/v1${DEPTS_BASE}/${deptId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
            : {}),
        },
      });
      // optimistic remove
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
      // also reload vehicles list (some may have pointed to this dept)
      await fetchVehicles();
      toast({ title: 'Department deleted', variant: 'destructive' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignVehicle() {
    if (!currentDept || !vehicleToAssign) return;
    try {
      setLoading(true);
      await apiPut(`/vehicles/${vehicleToAssign}`, { department_id: Number(currentDept.id) });
      await fetchVehicles();
      toast({ title: 'Vehicle assigned' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setVehicleToAssign('');
      setLoading(false);
    }
  }

  async function handleRemoveVehicle(_deptId: string, vehicleId: string) {
    try {
      setLoading(true);
      await apiPut(`/vehicles/${vehicleId}`, { department_id: null });
      await fetchVehicles();
      toast({ title: 'Vehicle removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const vehicleCountBadge = (n: number) => (
    <Badge variant="secondary" className="ml-2">{n} {n === 1 ? 'vehicle' : 'vehicles'}</Badge>
  );

  // ---- render ---------------------------------------------------------------
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Departments</h1>

        {/* Create / Edit Department */}
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setCurrentDept(null);
              setDeptName('');
              setIsNew(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => { setIsNew(true); setCurrentDept(null); setDeptName(''); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Department
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isNew ? 'Create Department' : 'Edit Department'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Name</Label>
                <Input
                  id="dept-name"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={loading}>Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleSaveDepartment} disabled={loading}>Save</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {departmentsWithVehicles.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No departments yet. Create one to get started.</p>
        ) : null}

        {departmentsWithVehicles.map((dept) => {
          const count = dept.vehicles?.length ?? 0;

          return (
            <Card key={dept.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>{dept.name}</CardTitle>
                  {vehicleCountBadge(count)}
                </div>

                <div className="flex items-center gap-1">
                  {/* Edit Dept */}
                  <Dialog
                    onOpenChange={(open) => {
                      if (!open) {
                        setCurrentDept(null);
                        setDeptName('');
                        setIsNew(false);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsNew(false);
                          setCurrentDept(dept);
                          setDeptName(dept.name);
                        }}
                        aria-label="Edit department"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                      </DialogHeader>

                      <div className="grid gap-4 py-4">
                        <Label htmlFor="dept-name-edit">Name</Label>
                        <Input
                          id="dept-name-edit"
                          value={deptName}
                          onChange={(e) => setDeptName(e.target.value)}
                          disabled={loading}
                        />
                      </div>

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" disabled={loading}>Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={handleSaveDepartment} disabled={loading}>Save</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Delete Dept */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Delete department">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{dept.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the department.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>

              <CardContent>
                <h4 className="mb-2 font-semibold">Assigned Vehicles</h4>

                <div className="space-y-2">
                  {count > 0 ? (
                    dept.vehicles!.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span>{v.make} {v.model} ({v.licensePlate})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveVehicle(dept.id, v.id)}
                          aria-label="Remove vehicle from department"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No vehicles assigned.</p>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                {/* Assign Vehicle */}
                <Dialog
                  onOpenChange={(open) => {
                    if (!open) {
                      setCurrentDept(null);
                      setVehicleToAssign('');
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setCurrentDept(dept);
                        setVehicleToAssign('');
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Assign Vehicle
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Vehicle to {currentDept?.name}</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                      <Label>Available Vehicles</Label>
                      <Select value={vehicleToAssign} onValueChange={setVehicleToAssign}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVehicles.length === 0 ? (
                            <div className="px-2 py-1 text-sm text-muted-foreground">
                              No available vehicles
                            </div>
                          ) : (
                            availableVehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.make} {v.model} ({v.licensePlate})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button onClick={handleAssignVehicle} disabled={!vehicleToAssign}>
                          Assign
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
