'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog';
import { Car, Wrench, CheckCircle2, X, SlidersHorizontal, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, apiPost } from '@/lib/apiClient';

type ApiVehicle = {
  id: number;
  plate_number: string;
  make?: string | null;
  model?: string | null;
  status?: 'available' | 'assigned' | 'in_maintenance' | 'inactive';
  odometer?: number | null;
  department_id?: number | null;
  ministry_id?: number | null;
};

type ApiDepartment = { id: number; name: string };
type ApiMe = { id: number; name: string; role?: { name: string } };

const NONE = '__none__';

function PageInner() {
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [me, setMe] = useState<ApiMe | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | ApiVehicle['status']>('all');

  // assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<ApiVehicle | null>(null);
  const [deptToAssign, setDeptToAssign] = useState<string>(NONE);

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [cPlate, setCPlate] = useState('');
  const [cMake, setCMake] = useState('');
  const [cModel, setCModel] = useState('');
  const [cVIN, setCVIN] = useState('');
  const [cType, setCType] = useState('');
  const [cCapacity, setCCapacity] = useState<string>('');
  const [cOdometer, setCOdometer] = useState<string>('');
  const [cDept, setCDept] = useState<string>(NONE);
  const [cStatus, setCStatus] = useState<'available' | 'assigned' | 'in_maintenance' | 'inactive'>('available');

  const canCreate = (me?.role?.name ?? '') === 'Ministry Admin';

  async function fetchMe() {
    try {
      const data = await apiGet<ApiMe>('/me');
      setMe(data);
    } catch {
      setMe(null);
    }
  }

  async function fetchVehicles() {
    try {
      const data = await apiGet<ApiVehicle[]>('/vehicles'); // ministry scoped
      setVehicles(Array.isArray(data) ? data : []);
      setFetchError(null);
    } catch (e: any) {
      setVehicles([]);
      setFetchError(String(e?.message ?? e));
    }
  }

  async function fetchDepartments() {
    try {
      const res = await apiGet<ApiDepartment[] | { data: ApiDepartment[] }>('/ministry/departments');
      const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch {
      setDepartments([]);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchMe(), fetchVehicles(), fetchDepartments()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtered list
  const filtered = useMemo(() => {
    let list = vehicles;
    if (status !== 'all') list = list.filter(v => (v.status ?? 'available') === status);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(v =>
        (v.plate_number || '').toLowerCase().includes(needle) ||
        (v.make || '').toLowerCase().includes(needle) ||
        (v.model || '').toLowerCase().includes(needle)
      );
    }
    return list;
  }, [vehicles, status, q]);

  const counts = useMemo(() => {
    const total = vehicles.length;
    const by = vehicles.reduce<Record<string, number>>((acc, v) => {
      const s = v.status ?? 'available';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return { total, available: by['available'] || 0, assigned: by['assigned'] || 0, maint: by['in_maintenance'] || 0 };
  }, [vehicles]);

  function statusBadge(s?: ApiVehicle['status']) {
    const value =
      s === 'in_maintenance' ? 'Maintenance' :
      s === 'inactive' ? 'Inactive' :
      s === 'assigned' ? 'Assigned' :
      'Available';
    const isAvailable = value === 'Available';
    const isMaint = value === 'Maintenance';
    return (
      <Badge variant={isAvailable ? 'default' : isMaint ? 'destructive' : 'secondary'}>
        {isAvailable && <CheckCircle2 className="mr-1 h-3 w-3" />}
        {isMaint && <Wrench className="mr-1 h-3 w-3" />}
        {value}
      </Badge>
    );
  }

  const openAssign = (v: ApiVehicle) => {
    setCurrentVehicle(v);
    setDeptToAssign(v.department_id ? String(v.department_id) : NONE);
    setAssignOpen(true);
  };

  const assignVehicle = async () => {
    if (!currentVehicle) return;
    try {
      setLoading(true);
      await apiPut(`/vehicles/${currentVehicle.id}`, {
        department_id: deptToAssign === NONE ? null : Number(deptToAssign),
      });
      await fetchVehicles();
      toast({ title: 'Success', description: deptToAssign === NONE ? 'Vehicle unassigned.' : 'Vehicle assigned.' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setAssignOpen(false);
      setCurrentVehicle(null);
      setDeptToAssign(NONE);
      setLoading(false);
    }
  };

  const unassignVehicle = async (v: ApiVehicle) => {
    try {
      setLoading(true);
      await apiPut(`/vehicles/${v.id}`, { department_id: null });
      await fetchVehicles();
      toast({ title: 'Success', description: 'Vehicle unassigned.' });
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  function resetCreateForm() {
    setCPlate('');
    setCMake('');
    setCModel('');
    setCVIN('');
    setCType('');
    setCCapacity('');
    setCOdometer('');
    setCDept(NONE);
    setCStatus('available');
  }

  const handleCreate = async () => {
    if (!cPlate.trim()) {
      toast({ title: 'Plate is required', variant: 'destructive' });
      return;
    }
    const payload: any = {
      plate_number: cPlate.trim(),
      make: cMake.trim() || undefined,
      model: cModel.trim() || undefined,
      vin: cVIN.trim() || undefined,
      type: cType.trim() || undefined,
      capacity: cCapacity ? Number(cCapacity) : undefined,
      odometer: cOdometer ? Number(cOdometer) : undefined,
      status: cStatus,
      department_id: cDept === NONE ? null : Number(cDept),
    };

    try {
      setLoading(true);
      await apiPost('/vehicles', payload);
      toast({ title: 'Vehicle created' });
      await fetchVehicles();
      setCreateOpen(false);
      resetCreateForm();
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard roles={['Ministry Admin', 'Fleet Manager']}>
      <div className="grid gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-headline">Vehicles</h1>
          <p className="text-muted-foreground">View and organize vehicles in your ministry.</p>
        </div>

        {fetchError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            Failed to load vehicles. {fetchError}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Fleet</CardTitle>
              <CardDescription>
                {counts.total} total • {counts.available} available • {counts.assigned} assigned • {counts.maint} in maintenance
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Search (plate, make, model)…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-[220px]"
              />

              {canCreate && (
                <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="ml-2">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Plate Number <span className="text-destructive">*</span></Label>
                          <Input value={cPlate} onChange={(e) => setCPlate(e.target.value)} />
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={cStatus} onValueChange={(v: any) => setCStatus(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in_maintenance">Maintenance</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Make</Label>
                          <Input value={cMake} onChange={(e) => setCMake(e.target.value)} />
                        </div>
                        <div>
                          <Label>Model</Label>
                          <Input value={cModel} onChange={(e) => setCModel(e.target.value)} />
                        </div>
                        <div>
                          <Label>VIN</Label>
                          <Input value={cVIN} onChange={(e) => setCVIN(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Type</Label>
                          <Input value={cType} onChange={(e) => setCType(e.target.value)} />
                        </div>
                        <div>
                          <Label>Capacity</Label>
                          <Input type="number" inputMode="numeric" value={cCapacity} onChange={(e) => setCCapacity(e.target.value)} />
                        </div>
                        <div>
                          <Label>Odometer</Label>
                          <Input type="number" inputMode="numeric" value={cOdometer} onChange={(e) => setCOdometer(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <Label>Department (optional)</Label>
                          <Select value={cDept} onValueChange={setCDept}>
                            <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— None —</SelectItem>
                              {departments.map(d => (
                                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleCreate} disabled={loading || !cPlate.trim()}>
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loading && <p className="text-sm text-muted-foreground mb-3">Loading…</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      {(v.make ?? '')} {(v.model ?? '')}
                    </TableCell>
                    <TableCell>{v.plate_number}</TableCell>
                    <TableCell>{statusBadge(v.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openAssign(v)}>
                        {v.department_id ? 'Change Dept' : 'Assign Dept'}
                      </Button>
                      {v.department_id ? (
                        <Button variant="ghost" size="icon" onClick={() => unassignVehicle(v)} title="Unassign">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No vehicles match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign / Change Department */}
        <Dialog open={assignOpen} onOpenChange={(o) => { if (!o) { setAssignOpen(false); setCurrentVehicle(null); setDeptToAssign(NONE); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {currentVehicle?.department_id ? 'Change Department' : 'Assign Department'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Vehicle: <span className="font-medium">{currentVehicle?.make} {currentVehicle?.model} ({currentVehicle?.plate_number})</span>
              </p>
              <Select value={deptToAssign} onValueChange={setDeptToAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                  <SelectItem value={NONE}>— Unassign —</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <DialogClose asChild>
                <Button onClick={assignVehicle} disabled={loading}>
                  {deptToAssign === NONE ? 'Unassign' : 'Assign'}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

export default function MinistryVehiclesPage() {
  return <PageInner />;
}
