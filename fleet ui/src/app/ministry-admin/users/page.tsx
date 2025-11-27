'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

type ApiDepartment = { id: number; name: string };
type ApiUser = {
  id: number;
  name: string;
  email: string;
  role?: { id: number; name: 'Ministry Admin' | 'Fleet Manager' | 'Driver' | 'Worker' | 'Supervisor' | string };
  department_id?: number | null;
  department?: { id: number; name: string } | null;
};

const ROLE_FILTERS = ['All', 'Supervisor', 'Fleet Manager', 'Driver', 'Staff'] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];
type CreateRole = 'Supervisor' | 'Fleet Manager' | 'Driver' | 'Staff';

// Backend uses "Worker" for Staff on DB
const mapRoleToParam = (r: RoleFilter | CreateRole): string =>
  r === 'Staff' ? 'Worker' : r;

const CREATE_ENDPOINT: Record<CreateRole, string> = {
  Supervisor: '/ministry/users/supervisor',
  'Fleet Manager': '/ministry/users/fleet-manager',
  Driver: '/ministry/users/driver',
  Staff: '/ministry/users/staff', // maps to Worker server-side
};

const displayRole = (backendName?: string) =>
  backendName === 'Worker' ? 'Staff' : backendName || '—';

// shadcn Select needs a stable non-empty sentinel for “None”
const NONE = '__none__';

export default function MinistryUsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [filterRole, setFilterRole] = useState<RoleFilter>('All');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [creatingRole, setCreatingRole] = useState<CreateRole>('Supervisor');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDept, setFormDept] = useState<string>(NONE);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);

  const mustHaveDepartment = (role: CreateRole | string | undefined) =>
    role === 'Staff' || role === 'Worker' || role === 'Supervisor';

  function resetForm() {
    setFormName('');
    setFormEmail('');
    setFormDept(NONE);
  }

  async function safeMessage(res: Response): Promise<string | null> {
    try {
      const text = await res.text();
      if (!text) return null;
      try {
        const json = JSON.parse(text);
        return json?.message || text;
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  }

  async function fetchDepartments() {
    const res = await apiGet<ApiDepartment[] | { data: ApiDepartment[] }>('/ministry/departments');
    const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
    setDepartments(Array.isArray(list) ? list : []);
  }

  async function fetchUsers() {
    const params = new URLSearchParams();
    if (filterRole !== 'All') params.set('role', mapRoleToParam(filterRole));
    if (q.trim()) params.set('q', q.trim());

    const res = await apiGet<ApiUser[] | { data: ApiUser[] }>(`/users?${params.toString()}`);
    const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
    // Hide Ministry Admin on this page
    const cleaned = (Array.isArray(list) ? list : []).filter(
      u => u.role?.name !== 'Ministry Admin'
    );
    setUsers(cleaned);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchDepartments(), fetchUsers()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await fetchUsers(); } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, q]);

  const counts = useMemo(() => {
    const arr = Array.isArray(users) ? users : [];
    const sup = arr.filter(u => u.role?.name === 'Supervisor').length;
    const fm  = arr.filter(u => u.role?.name === 'Fleet Manager').length;
    const dr  = arr.filter(u => u.role?.name === 'Driver').length;
    const st  = arr.filter(u => u.role?.name === 'Worker').length; // staff
    return { total: arr.length, sup, fm, dr, st };
  }, [users]);

  const filtered = useMemo(() => {
    const arr = Array.isArray(users) ? users : [];
    return arr
      .filter(u => {
        if (filterRole === 'All') return true;
        return u.role?.name === mapRoleToParam(filterRole);
      })
      .filter(u => {
        const s = q.toLowerCase();
        return !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
      });
  }, [users, filterRole, q]);

  async function handleCreate() {
    if (!formName.trim() || !formEmail.trim()) return;

    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim(),
    };

    if (creatingRole === 'Staff' || creatingRole === 'Supervisor') {
      if (formDept === NONE) {
        toast({
          title: 'Department required',
          description: `${creatingRole} must belong to a department.`,
          variant: 'destructive'
        });
        return;
      }
      payload.department_id = Number(formDept);
    } else {
      payload.department_id = null; // Drivers & Fleet Managers are ministry-wide
    }

    setLoading(true);
    try {
      await apiPost(CREATE_ENDPOINT[creatingRole], payload);
      toast({ title: 'Success', description: `${creatingRole} created.` });
      await fetchUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setOpenCreate(false);
      resetForm();
      setLoading(false);
    }
  }

  function openEditFor(u: ApiUser) {
    setEditingUser(u);
    setFormName(u.name ?? '');
    const roleName = u.role?.name;
    if (mustHaveDepartment(roleName)) {
      setFormDept(u.department_id ? String(u.department_id) : NONE);
    } else {
      setFormDept(NONE);
    }
    setOpenEdit(true);
  }

  async function handleUpdate() {
    if (!editingUser) return;
    const roleName = editingUser.role?.name;

    const payload: any = { name: formName.trim() };

    if (mustHaveDepartment(roleName)) {
      if (formDept === NONE) {
        toast({
          title: 'Department required',
          description: 'This role must belong to a department.',
          variant: 'destructive'
        });
        return;
      }
      payload.department_id = Number(formDept);
    } else {
      payload.department_id = null;
    }

    setLoading(true);
    try {
      await apiPut(`/users/${editingUser.id}`, payload);
      toast({ title: 'Updated', description: 'User updated.' });
      await fetchUsers();
      setOpenEdit(false);
      setEditingUser(null);
      resetForm();
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
            : {}),
        },
      });
      if (!res.ok) throw new Error((await safeMessage(res)) || `HTTP ${res.status}`);
      toast({ title: 'Deleted', description: 'User removed.' });
      await fetchUsers();
    } catch (e: any) {
      toast({ title: 'Error', description: String(e?.message ?? e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Users</h1>
        <p className="text-muted-foreground">
          Create and manage Supervisors, Fleet Managers, Drivers, and Staff for your ministry.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Team</span>
            <span className="text-sm font-normal text-muted-foreground">
              {counts.total} users • {counts.sup} Supervisors • {counts.fm} Fleet Managers • {counts.dr} Drivers • {counts.st} Staff
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterRole} onValueChange={(v: RoleFilter) => setFilterRole(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search name/email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-72"
            />

            <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="ml-auto">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Role</Label>
                      <Select
                        value={creatingRole}
                        onValueChange={(v: CreateRole) => {
                          setCreatingRole(v);
                          setFormDept(NONE); // reset on switch
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="Fleet Manager">Fleet Manager</SelectItem>
                          <SelectItem value="Driver">Driver</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        Department {(creatingRole === 'Staff' || creatingRole === 'Supervisor') && <span className="text-destructive">*</span>}
                      </Label>
                      <Select
                        value={formDept}
                        onValueChange={setFormDept}
                        disabled={!(creatingRole === 'Staff' || creatingRole === 'Supervisor')}
                      >
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button
                    onClick={handleCreate}
                    disabled={
                      loading ||
                      !formName.trim() ||
                      !formEmail.trim() ||
                      ((creatingRole === 'Staff' || creatingRole === 'Supervisor') && formDept === NONE)
                    }
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No users match your filters.</TableCell></TableRow>
                )}
                {filtered.map(u => {
                  const isMinistryWide = u.role?.name === 'Driver' || u.role?.name === 'Fleet Manager';
                  const deptText = isMinistryWide ? '— (Ministry-wide)' : (u.department?.name ?? '—');
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{displayRole(u.role?.name)}</TableCell>
                      <TableCell>{deptText}</TableCell>
                      <TableCell className="text-right">
                        <Dialog open={openEdit && editingUser?.id === u.id} onOpenChange={(o) => { if (!o) { setOpenEdit(false); setEditingUser(null); resetForm(); } }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEditFor(u)}><Edit className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Name</Label>
                                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                                </div>
                                <div>
                                  <Label>
                                    Department {mustHaveDepartment(u.role?.name) && <span className="text-destructive">*</span>}
                                  </Label>
                                  <Select
                                    value={formDept}
                                    onValueChange={setFormDept}
                                    disabled={!mustHaveDepartment(u.role?.name)}
                                  >
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
                              <Button onClick={handleUpdate} disabled={loading}>Save</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(u.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
