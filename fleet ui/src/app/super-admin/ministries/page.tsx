'use client';

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit } from 'lucide-react';
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

import type { Ministry } from '@/lib/types';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

// Shape coming back from Laravel (adjust if your controller returns more fields)
type ApiMinistry = {
    id: number;
    name: string;
    description?: string | null;
    // optional counts if you later expose them
    admin_count?: number;
    user_count?: number;
    vehicle_count?: number;
};

// helper: map API -> UI row (default counts to 0 if not provided)
function mapApi(m: ApiMinistry): Ministry {
    return {
        id: String(m.id),
        name: m.name,
        adminCount: m.admin_count ?? 0,
        userCount: m.user_count ?? 0,
        vehicleCount: m.vehicle_count ?? 0,
    };
}

export default function MinistriesPage() {
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [loading, setLoading] = useState(false);

    const [isNewMinistry, setIsNewMinistry] = useState(false);
    const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
    const [ministryName, setMinistryName] = useState('');

    // Read ministries from API. Supports either `[...]` or `{ data: [...] }`.
    async function fetchMinistries() {
        try {
            setLoading(true);

            // Try plain array first
            let raw = await apiGet<ApiMinistry[] | { data: ApiMinistry[] }>('/ministries');
            const list: ApiMinistry[] = Array.isArray(raw)
                ? raw
                : Array.isArray((raw as any).data)
                    ? (raw as any).data
                    : [];

            setMinistries(list.map(mapApi));
        } catch (e) {
            console.error('Failed to load ministries', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMinistries();
    }, []);

    const handleOpenDialog = (ministry: Ministry | null) => {
        if (ministry) {
            setIsNewMinistry(false);
            setSelectedMinistry(ministry);
            setMinistryName(ministry.name);
        } else {
            setIsNewMinistry(true);
            setSelectedMinistry(null);
            setMinistryName('');
        }
    };

    async function refreshList() {
        await fetchMinistries();
    }

    const handleSave = async () => {
        if (!ministryName.trim()) return;

        try {
            setLoading(true);

            if (isNewMinistry) {
                // POST /api/v1/ministries
                // If the API returns the created record, append it locally; else refresh.
                const created =
                    (await apiPost<ApiMinistry | { data: ApiMinistry }>('/ministries', {
                        name: ministryName.trim(),
                    })) as any;

                const createdEntity: ApiMinistry | undefined = created?.id
                    ? created
                    : created?.data?.id
                        ? created.data
                        : undefined;

                if (createdEntity) {
                    setMinistries((prev) => [...prev, mapApi(createdEntity)]);
                } else {
                    await refreshList();
                }
            } else if (selectedMinistry) {
                // PUT /api/v1/ministries/{id}
                const updated =
                    (await apiPut<ApiMinistry | { data: ApiMinistry }>(
                        `/ministries/${selectedMinistry.id}`,
                        { name: ministryName.trim() }
                    )) as any;

                const updatedEntity: ApiMinistry | undefined = updated?.id
                    ? updated
                    : updated?.data?.id
                        ? updated.data
                        : undefined;

                if (updatedEntity) {
                    setMinistries((prev) =>
                        prev.map((m) => (m.id === String(updatedEntity.id) ? mapApi(updatedEntity) : m))
                    );
                } else {
                    await refreshList();
                }
            }
        } catch (e) {
            console.error('Save ministry failed', e);
        } finally {
            setSelectedMinistry(null);
            setMinistryName('');
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline">Ministries</h1>

                <Dialog
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedMinistry(null);
                            setMinistryName('');
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog(null)} disabled={loading}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Ministry
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isNewMinistry ? 'Create Ministry' : 'Edit Ministry'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={ministryName}
                                    onChange={(e) => setMinistryName(e.target.value)}
                                    className="col-span-3"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" disabled={loading}>
                                    Cancel
                                </Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button onClick={handleSave} disabled={loading || !ministryName.trim()}>
                                    Save
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ministries Management</CardTitle>
                    <CardDescription>Create, view, and edit ministries.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Admins</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Vehicles</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ministries.map((ministry) => (
                                <TableRow key={ministry.id}>
                                    <TableCell className="font-medium">{ministry.name}</TableCell>
                                    <TableCell>{ministry.adminCount}</TableCell>
                                    <TableCell>{ministry.userCount}</TableCell>
                                    <TableCell>{ministry.vehicleCount}</TableCell>
                                    <TableCell className="text-right">
                                        <Dialog
                                            onOpenChange={(isOpen) => {
                                                if (!isOpen) {
                                                    setSelectedMinistry(null);
                                                    setMinistryName('');
                                                }
                                            }}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(ministry)}
                                                    disabled={loading}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Edit Ministry</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="name" className="text-right">
                                                            Name
                                                        </Label>
                                                        <Input
                                                            id="name"
                                                            value={ministryName}
                                                            onChange={(e) => setMinistryName(e.target.value)}
                                                            className="col-span-3"
                                                            disabled={loading}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button variant="outline" disabled={loading}>
                                                            Cancel
                                                        </Button>
                                                    </DialogClose>
                                                    <DialogClose asChild>
                                                        <Button
                                                            onClick={handleSave}
                                                            disabled={loading || !ministryName.trim()}
                                                        >
                                                            Save
                                                        </Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {ministries.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No ministries yet.
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
