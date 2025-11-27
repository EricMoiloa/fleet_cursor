'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SupervisorRequestsBoard } from '@/components/supervisor/request-board';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import type { RequestStatus, RequestStatusUI } from '@/lib/types';

/** Map raw API string -> UI status (includes "Pending Supervisor") */
function toUiStatus(raw?: string | null): RequestStatusUI {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'pending' || s.includes('pending_supervisor') || s.includes('supervisor')) return 'Pending Supervisor';
  if (s === 'pending_fleet' || s.includes('pending fleet')) return 'Pending';
  if (s === 'denied' || s.startsWith('rejected')) return 'Denied';
  if (s.startsWith('approved')) return 'Approved';
  if (s.startsWith('active')) return 'Active';
  if (s.startsWith('completed')) return 'Completed';
  return 'Pending Supervisor';
}

/** Local UI type (forces dateTime to string and status to RequestStatusUI) */
type VehicleRequestUI = {
  id: string;
  purpose: string;
  origin: string;
  destination: string;
  dateTime: string;
  status: RequestStatusUI;
  requester: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
};

export default function SupervisorRequestsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<VehicleRequestUI[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await apiGet<any>('/supervisor/requests');
    const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);

    const list: VehicleRequestUI[] = rows.map((r) => ({
      id: String(r.id),
      purpose: String(r?.purpose ?? ''),
      origin: String(r?.origin ?? ''),
      destination: String(r?.destination ?? ''),
      dateTime: String(r?.created_at ?? r?.date_time ?? new Date().toISOString()),
      status: toUiStatus(r?.status),
      requester: {
        id: String(r?.requested_by_user?.id ?? r?.requester?.id ?? r?.requester_id ?? ''),
        name: String(r?.requested_by_user?.name ?? r?.requester?.name ?? r?.requester_name ?? '-'),
        email: r?.requested_by_user?.email ?? '',
        avatarUrl: r?.requested_by_user?.avatar_url ?? '',
      },
    }));

    setItems(list);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  const pending = useMemo(
    () => items.filter((r) => r.status === 'Pending Supervisor'),
    [items]
  );

  const all = useMemo(
    () => items.filter((r) => r.status === 'Pending Supervisor' || r.status === 'Pending' || r.status === 'Denied'),
    [items]
  );

  const onAction = useCallback(
    async (id: string, next: RequestStatus) => {
      const decision =
        next === 'Pending'
          ? { decision: 'approve', by: 'supervisor' }
          : next === 'Denied'
          ? { decision: 'reject', by: 'supervisor' }
          : null;

      if (!decision) return;

      setLoading(true);
      try {
        await apiPost(`/supervisor/requests/${id}/decide`, decision);
        const finalStatus =
          decision.decision === 'approve'
            ? 'Approved and sent to Fleet Manager'
            : 'Denied';

        // notify
        (window as any)?.console?.log(finalStatus);

        await load();
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Approve Vehicle Requests</h1>
        <p className="text-muted-foreground">Review and approve requests from your department.</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending Your Approval</TabsTrigger>
          <TabsTrigger value="all">All Your Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <SupervisorRequestsBoard
            requests={pending}
            onAction={(id, s) => { void onAction(id, s); }}
            userRole="Supervisor"
            showAll
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <SupervisorRequestsBoard
            requests={all}
            onAction={() => { /* read-only */ }}
            userRole="Supervisor"
            showAll
            isReadOnly
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
