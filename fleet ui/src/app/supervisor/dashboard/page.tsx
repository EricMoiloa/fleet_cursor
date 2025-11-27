'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { SupervisorRequestsBoard } from '@/components/supervisor/request-board';
import { Bell, Check, Users, XCircle } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/apiClient';
import { AuthGuard } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import type { VehicleRequest, RequestStatus, RequestStatusUI } from '@/lib/types';

/** Raw -> UI status mapping aligned to backend */
function toUiStatus(raw?: string | null): RequestStatusUI {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'pending') return 'Pending Supervisor';            // legacy
  if (s === 'pending_supervisor') return 'Pending Supervisor'; // current
  if (s === 'pending_fleet') return 'Pending';                 // supervisor approved → with Fleet
  if (s === 'rejected_by_supervisor' || s === 'denied') return 'Denied';
  if (s.startsWith('approved')) return 'Approved';
  if (s.startsWith('active')) return 'Active';
  if (s.startsWith('completed')) return 'Completed';
  return 'Pending Supervisor';
}

/** Normalize to the board shape */
function toBoardShape(r: VehicleRequest) {
  return {
    ...r,
    dateTime: String(r.dateTime ?? ''),
    status: (r.status as RequestStatus | 'Pending Supervisor' | 'Approved' | 'Completed' | 'Active' | 'Queued' | 'Booked'),
  };
}

export default function SupervisorDashboardPage() {
  return (
    <AuthGuard roles={['Supervisor' as UserRole]}>
      <PageInner />
    </AuthGuard>
  );
}

type FilterKey = 'all' | 'pending' | 'approved' | 'denied';

export function PageInner() {
  const { toast } = useToast();
  const [items, setItems] = useState<VehicleRequest[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('pending');

  const load = useCallback(async () => {
    const res = await apiGet<any>('/supervisor/requests');
    const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
    const list: VehicleRequest[] = rows.map((r) => ({
      id: String(r.id),
      purpose: r?.purpose ?? '',
      origin: r?.origin ?? '',
      destination: r?.destination ?? '',
      dateTime: r?.created_at ?? r?.start_at ?? r?.date_time ?? null,
      status: toUiStatus(r?.status),
      requester: {
        id: r?.requested_by_user?.id ?? r?.requester?.id ?? undefined,
        name: r?.requested_by_user?.name ?? r?.requester?.name ?? r?.requester_name ?? '-',
        email: r?.requested_by_user?.email ?? '',
        avatarUrl: r?.requested_by_user?.avatar_url ?? '',
      },
    }));
    setItems(list);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingSupervisor = useMemo(
    () => items.filter((r) => r.status === 'Pending Supervisor'),
    [items]
  );
  const approvedToFleet = useMemo(
    () => items.filter((r) => r.status === 'Pending'),
    [items]
  );
  const deniedByYou = useMemo(
    () => items.filter((r) => r.status === 'Denied'),
    [items]
  );

  const kpis = {
    pending: pendingSupervisor.length,
    approved: approvedToFleet.length,
    denied: deniedByYou.length,
    total: items.length,
  };

  /**
   * Use the same apiPost helper as the rest of your app.
   * If /decide isn't available in some env, fall back to legacy routes.
   */
  const postDecision = useCallback(
    async (id: string, decision: 'approve' | 'reject', notes: string) => {
      try {
        await apiPost(`/supervisor/requests/${id}/decide`, {
          decision,
          notes: notes ?? '',
        });
      } catch (err: any) {
        const msg = String(err?.message || '');
        const notFound = msg.includes('404') || /not\s*found/i.test(msg);
        if (notFound) {
          const legacy = decision === 'approve'
            ? `/supervisor/requests/${id}/approve`
            : `/supervisor/requests/${id}/reject`;
          await apiPost(legacy, {}); // legacy endpoints expect no body
          return;
        }
        // If it's a 422 from validation/state, bubble up so we rollback
        throw err;
      }
    },
    []
  );

  /**
   * Approve / Deny with optimistic removal from "Pending".
   */
  const onAction = useCallback(
    async (id: string, next: RequestStatus) => {
      const isApprove = next === 'Pending';
      const isReject  = next === 'Denied';
      if (!isApprove && !isReject) return;

      const newUiStatus: RequestStatusUI = isApprove ? 'Pending' : 'Denied';
      const before = items;

      // Optimistic: immediately move it out of Pending
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: newUiStatus } : it)));
      setActingId(id);

      try {
        await postDecision(id, isApprove ? 'approve' : 'reject', '');
        toast({
          description: isApprove
            ? 'Approved and forwarded to Fleet.'
            : 'Request rejected.',
        });
        // Refresh to reflect any server-side transitions
        await load();
      } catch (e: any) {
        // Rollback on failure
        setItems(before);
        toast({ variant: 'destructive', description: e?.message ?? 'Action failed.' });
      } finally {
        setActingId(null);
      }
    },
    [items, load, postDecision, toast]
  );

  const filtered: VehicleRequest[] = useMemo(() => {
    switch (filter) {
      case 'pending':  return pendingSupervisor;
      case 'approved': return approvedToFleet;
      case 'denied':   return deniedByYou;
      default:         return items;
    }
  }, [filter, items, pendingSupervisor, approvedToFleet, deniedByYou]);

  const preview = useMemo(() => filtered.slice(0, 4).map(toBoardShape), [filtered]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Supervisor Dashboard</h1>
        <p className="text-muted-foreground">Approve team vehicle requests.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pending Approval" value={String(kpis.pending)} icon={Bell} />
        <KpiCard title="Approved" value={String(kpis.approved)} icon={Check} />
        <KpiCard title="Denied by You" value={String(kpis.denied)} icon={XCircle} />
        <KpiCard title="Total Team Requests" value={String(kpis.total)} icon={Users} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { k: 'pending',  label: 'Pending' },
          { k: 'approved', label: 'Approved' },
          { k: 'denied',   label: 'Denied' },
          { k: 'all',      label: 'All' },
        ] as const).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-md border text-sm ${
              filter === k ? 'bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <SupervisorRequestsBoard
        requests={preview}
        showAll
        onAction={(id, s) => { void onAction(id, s); }}
        userRole="Supervisor"
        busyId={actingId}   // disables buttons for the acting card
      />
    </div>
  );
}
