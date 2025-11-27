'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Filter } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import type { Ministry } from '@/lib/types';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

type UiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  ministry?: string;
};

const ROLE_OPTIONS = ['Ministry Admin', 'Fleet Manager', 'Driver', 'Worker', 'All'] as const;
type RoleFilter = typeof ROLE_OPTIONS[number];

export default function UsersPage() {
  const [users, setUsers] = useState<UiUser[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(false);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Ministry Admin'); // default view

  const [isNewUser, setIsNewUser] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UiUser | null>(null);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [selectedMinistry, setSelectedMinistry] = useState<string>('');

  // --- fetch helpers ---------------------------------------------------------
  async function fetchMinistries() {
    try {
      const res = await apiGet<any>('/ministries');
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setMinistries(
        data.map((m: any) => ({ id: String(m.id), name: m.name, adminCount: 0, userCount: 0, vehicleCount: 0 }))
      );
    } catch (e) {
      console.error('Failed to load ministries', e);
      setMinistries([]);
    }
  }

  async function fetchUsers(role: RoleFilter) {
    try {
      const query = role && role !== 'All' ? `?role=${encodeURIComponent(role)}` : '';
      const res = await apiGet<any>(`/users${query}`);
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

      const list: UiUser[] = data.map((u: any) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        role: typeof u.role === 'object' ? u.role?.name ?? '' : u.role ?? '',
        ministry:
          typeof u.ministry === 'object'
            ? u.ministry?.name ?? ''
            : u.ministry ?? '',
      }));

      setUsers(list);
    } catch (e) {
      console.error('Failed to load users', e);
      setUsers([]);
    }
  }

  useEffect(() => {
    fetchMinistries();
  }, []);

  useEffect(() => {
    fetchUsers(roleFilter);
  }, [roleFilter]);

  // --- dialog handlers -------------------------------------------------------
  function openCreateDialog() {
    setIsNewUser(true);
    setSelectedUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setSelectedMinistry('');
    setDialogOpen(true);
  }

  function openEditDialog(user: UiUser) {
    setIsNewUser(false);
    setSelectedUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPassword('');
    setSelectedMinistry('');
    setDialogOpen(true);
  }

  function closeDialogAndReset() {
    setDialogOpen(false);
    setSelectedUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setSelectedMinistry('');
  }

  // --- save ------------------------------------------------------------------
  async function handleSave() {
    if (!userName.trim() || !userEmail.trim()) return;
    try {
      setLoading(true);

      if (isNewUser) {
        await apiPost('/users', {
          name: userName.trim(),
          email: userEmail.trim(),
          role: 'Ministry Admin', // Super Admin can only create Ministry Admins here
          ministry_id: selectedMinistry ? Number(selectedMinistry) : null,
          ...(userPassword ? { password: userPassword } : {}),
        });
      } else if (selectedUser) {
        await apiPut(`/users/${selectedUser.id}`, {
          name: userName.trim(),
          email: userEmail.trim(),
          ministry_id: selectedMinistry ? Number(selectedMinistry) : null,
        });
      }

      await fetchUsers(roleFilter);
      closeDialogAndReset();
    } catch (e) {
      console.error('Failed to save user', e);
    } finally {
      setLoading(false);
    }
  }

  // --- UI --------------------------------------------------------------------
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Users</h1>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={(v: RoleFilter) => setRoleFilter(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeDialogAndReset(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={loading || roleFilter !== 'Ministry Admin'}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isNewUser ? 'Create Ministry Admin' : 'Edit Ministry Admin'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="col-span-3"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="col-span-3"
                  disabled={loading}
                />
              </div>

              {isNewUser && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Temp Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="col-span-3"
                    disabled={loading}
                  />
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Ministry</Label>
                <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    {ministries.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialogAndReset} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{roleFilter === 'All' ? 'All Users' : `${roleFilter}s`} Management</CardTitle>
          <CardDescription>
            {roleFilter === 'Ministry Admin'
              ? 'Manage ministry-level administrators.'
              : `Viewing ${roleFilter}${roleFilter === 'Driver' ? 's' : 's'} across the system.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ministry</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.ministry ?? ''}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(user)}
                      disabled={roleFilter !== 'Ministry Admin'} // only edit admins here
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found.
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
