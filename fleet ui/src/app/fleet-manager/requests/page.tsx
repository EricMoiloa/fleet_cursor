'use client';

import { useEffect, useState, useCallback } from 'react';
import { RequestsBoard } from '@/components/fleet-manager/requests-board';
import type { FMRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/lib/apiClient';
import { unpackArrayOrData, isFulfilled } from '@/lib/utils';

export default function FleetManagerRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<FMRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<FMRequest[] | { data: FMRequest[] }>('/dispatch-requests');
      const list = unpackArrayOrData<FMRequest>(res) ?? [];
      setRequests(list);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load requests',
        description: e?.message ?? 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = load();
      await p;
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  async function refresh() {
    try {
      const res = await apiGet<FMRequest[] | { data: FMRequest[] }>('/dispatch-requests');
      setRequests(unpackArrayOrData<FMRequest>(res) ?? []);
    } catch {
      // keep last known state
    }
  }

  /** Board actions -> backend -> refresh */
  const onApprove = async (r: FMRequest) => {
    try {
      await apiPost(`/fleet/requests/${r.id}/decide`, { decision: 'approve' });
      toast({ title: 'Approved', description: `Request #${String(r.id).slice(-4)} approved.` });
      await refresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Approve failed', description: e?.message ?? 'Try again.' });
    }
  };

  const onReject = async (r: FMRequest) => {
    try {
      await apiPost(`/fleet/requests/${r.id}/decide`, { decision: 'reject' });
      toast({ title: 'Rejected', description: `Request #${String(r.id).slice(-4)} rejected.` });
      await refresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reject failed', description: e?.message ?? 'Try again.' });
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Vehicle Requests</h1>
        <p className="text-muted-foreground">Manage all incoming vehicle requests.</p>
      </div>

      {/* RequestsBoard doesn’t take a loading prop; show what we have */}
      <RequestsBoard
        requests={requests as any}
        showAll
        onApprove={onApprove}
        onReject={onReject}
      />
    </div>
  );
}
