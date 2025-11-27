<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupervisorController extends Controller
{
    /**
     * GET /api/v1/supervisor/requests
     * Only show requests the supervisor should see in their board.
     */
    public function requests(Request $request)
    {
        $me = $request->user()->load('role', 'department');

        $rows = DB::table('dispatch_requests as dr')
            ->leftJoin('users as ru', 'ru.id', '=', 'dr.requested_by')
            ->where('dr.ministry_id', $me->ministry_id)
            ->where('dr.department_id', $me->department_id)

            // Visibility for this supervisor
            ->where(function ($q) use ($me) {
                $q->where('dr.supervisor_id', $me->id)      // explicitly assigned
                  ->orWhere('ru.supervisor_id', $me->id)    // requester reports to me
                  ->orWhere(function ($q2) use ($me) {      // fallback: same dept & unassigned
                      $q2->whereNull('dr.supervisor_id')
                         ->where('dr.department_id', $me->department_id);
                  });
            })

            // Statuses relevant to supervisor views
            ->where(function ($q) {
                $q->where('dr.status', 'pending_supervisor')   // needs my decision
                  ->orWhere('dr.status', 'pending_fleet')      // I approved; with Fleet now
                  ->orWhere('dr.status', 'rejected_by_supervisor') // I rejected
                  ->orWhere('dr.status', 'pending');           // legacy rows
            })
            ->orderByDesc('dr.created_at')
            ->get([
                'dr.id',
                'dr.status',
                'dr.purpose',
                'dr.origin',
                'dr.destination',
                'dr.created_at',
                'dr.supervisor_decision',
                // requestor snippets for UI
                'ru.id as requester_id',
                'ru.name as requester_name',
                'ru.email as requester_email',
            ]);

        return response()->json(['data' => $rows], 200);
    }

    /**
     * POST /api/v1/supervisor/requests/{id}/decide
     * BODY: decision=approve|reject, notes?=string
     *
     * SUPERVISOR acknowledges only. Final allocation remains with Fleet.
     */
    public function decide(Request $request, $id)
    {
        $me = $request->user()->load('role');
        if (($me->role->name ?? null) !== 'Supervisor') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'decision' => 'required|string|in:approve,reject',
            'notes'    => 'nullable|string|max:500',
        ]);

        // Request must belong to my reportees (or be explicitly assigned to me)
        $req = DB::table('dispatch_requests as dr')
            ->join('users as u', 'u.id', '=', 'dr.requested_by')
            ->where('dr.id', $id)
            ->where(function ($q) use ($me) {
                $q->where('u.supervisor_id', $me->id)
                  ->orWhere('dr.supervisor_id', $me->id);
            })
            ->where('dr.department_id', $me->department_id)
            ->first([
                'dr.id',
                'dr.status',
                'dr.supervisor_decision',
                'dr.supervisor_id',
                'dr.department_id',
            ]);

        if (!$req) {
            return response()->json(['error' => 'Not found or not your report'], 404);
        }

        // Allow act if:
        //  - new flow: status=pending_supervisor; OR
        //  - legacy:   status=pending and no supervisor_decision yet
        $canAct = ($req->status === 'pending_supervisor')
               || ($req->status === 'pending' && is_null($req->supervisor_decision));

        if (!$canAct) {
            return response()->json([
                'error' => 'Request cannot be decided in its current state',
                'status' => $req->status,
                'supervisor_decision' => $req->supervisor_decision,
            ], 422);
        }

        // Idempotency: block repeat decisions
        if (in_array($req->supervisor_decision, ['approved', 'denied'], true)) {
            return response()->json([
                'error' => 'Supervisor already decided this request',
                'supervisor_decision' => $req->supervisor_decision,
            ], 409);
        }

        $isApprove = $data['decision'] === 'approve';

        // Target states:
        //  approve -> pending_fleet (Fleet must finalize)
        //  reject  -> rejected_by_supervisor (terminal for this path)
        $update = [
            'supervisor_decision'    => $isApprove ? 'approved' : 'denied',
            'supervisor_id'          => $me->id,
            'supervisor_note'        => $data['notes'] ?? null,   // adjust to supervisor_notes if needed
            'supervisor_decided_at'  => now(),
            'updated_at'             => now(),
            'status'                 => $isApprove ? 'pending_fleet' : 'rejected_by_supervisor',
            'forwarded_to_fleet_at'  => $isApprove ? now() : null,
        ];

        DB::table('dispatch_requests')->where('id', $id)->update($update);

        return response()->json([
            'message' => $isApprove
                ? 'Approved and forwarded to Fleet.'
                : 'Request rejected by supervisor.',
            'supervisor_decision' => $update['supervisor_decision'],
            'status'              => $update['status'],
        ], 200);
    }

    /**
     * Optional legacy endpoints that simply delegate to decide()
     * POST /api/v1/supervisor/requests/{id}/approve
     * POST /api/v1/supervisor/requests/{id}/reject
     */
    public function approve(Request $request, $id)
    {
        // Forge a small sub-request with decision=approve
        $request->merge(['decision' => 'approve']);
        return $this->decide($request, $id);
    }

    public function reject(Request $request, $id)
    {
        $request->merge(['decision' => 'reject']);
        return $this->decide($request, $id);
    }
}
