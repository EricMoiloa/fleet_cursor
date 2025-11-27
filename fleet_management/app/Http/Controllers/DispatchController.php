<?php

namespace App\Http\Controllers;

use App\Models\DispatchRequest;
use App\Models\Trip;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB; // ✅ needed for query builder

class DispatchController extends Controller
{
    /**
     * Staff/Driver/Worker can create a request.
     * Default status: 'pending_supervisor'
     * supervisor_id is auto-derived from requester's supervisor_id (if any).
     */
    public function store(Request $request)
    {
        $user = $request->user()->load('role');

        $data = $request->validate([
            'purpose'     => 'required|string|max:255',
            'origin'      => 'required|string|max:150',
            'destination' => 'required|string|max:150',
            'start_at'    => 'required|date',
            'end_at'      => 'nullable|date|after_or_equal:start_at',
        ]);

        $req = DispatchRequest::create([
            'ministry_id'   => $user->ministry_id,
            'department_id' => $user->department_id,
            'requested_by'  => $user->id,
            'supervisor_id' => $user->supervisor_id, // may be null
            'status'        => 'pending_supervisor',
        ] + $data);

        return response()->json(['message'=>'Request submitted','data'=>$req], 201);
    }

    /**
     * Role-aware listing:
     * - Fleet Manager: items pending & approved by supervisor (or legacy pending_fleet)
     * - Driver/Worker: only their own
     * - Ministry Admin: all in ministry
     * - Else (Supervisor): items where they're the assigned supervisor
     */
    public function index(Request $request)
    {
        $user = $request->user()->load('role');
        $role = $user->role->name ?? '';

        if ($role === 'Fleet Manager') {
            $rows = DB::table('dispatch_requests as dr')
                ->leftJoin('users as ru', 'ru.id', '=', 'dr.requested_by')
                ->leftJoin('vehicles as v', 'v.id', '=', 'dr.vehicle_id')
                ->where('dr.ministry_id', $user->ministry_id)
                ->where(function ($q) {
                    $q->where(function ($q2) {
                        $q2->where('dr.status', 'pending')
                           ->where('dr.supervisor_decision', 'approved');
                    })
                    ->orWhere('dr.status', 'pending_fleet'); // tolerate legacy flow
                })
                ->orderByDesc('dr.created_at')
                ->get([
                    'dr.id','dr.status','dr.purpose','dr.origin','dr.destination','dr.created_at',
                    'dr.supervisor_decision',
                    'ru.id as requester_id','ru.name as requester_name','ru.email as requester_email',
                    'v.id as vehicle_id','v.make','v.model','v.plate_number',
                ]);

            return response()->json(['data' => $rows], 200);
        }

        $q = DispatchRequest::with(['vehicle','driver','requester'])
            ->where('ministry_id', $user->ministry_id)
            ->orderByDesc('id');

        if ($role === 'Driver' || $role === 'Worker') {
            $q->where('requested_by', $user->id);
        } elseif ($role === 'Ministry Admin') {
            // see all in ministry
        } else {
            // Supervisor view
            $q->where('supervisor_id', $user->id);
        }

        return $q->paginate(20);
    }

    /* -------------------- SUPERVISOR DECISION -------------------- */

    /**
     * UI posts here: POST /api/v1/supervisor/requests/{id}/decide
     * Body: { decision: 'approve'|'reject', note?: string }
     */
    public function supervisorDecide($id, Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'decision' => 'required|string|in:approve,reject',
            'note'     => 'nullable|string|max:2000',
        ]);

        $req = DispatchRequest::findOrFail($id);

        if ((int)$req->ministry_id !== (int)$user->ministry_id) {
            return response()->json(['error'=>'Cross-ministry not allowed'], 403);
        }
        if ($req->supervisor_id && (int)$req->supervisor_id !== (int)$user->id) {
            return response()->json(['error'=>'Only the assigned supervisor can decide'], 403);
        }
        if ($req->status !== 'pending_supervisor') {
            return response()->json(['error'=>'Request is not awaiting supervisor'], 422);
        }

        if ($data['decision'] === 'reject') {
            $req->update([
                'supervisor_decision'   => 'denied',            // ✅ match enum
                'supervisor_decided_at' => now(),
                'supervisor_note'       => $data['note'] ?? null,
                'status'                => 'rejected_by_supervisor',
            ]);
            return response()->json(['message'=>'Request rejected','data'=>$req->fresh()], 200);
        }

        // approve -> hand over to fleet
        $req->update([
            'supervisor_decision'   => 'approved',
            'supervisor_decided_at' => now(),
            'supervisor_note'       => $data['note'] ?? null,
            'forwarded_to_fleet_at' => now(),
            // choose one approach; keep both tolerated across code:
            // A) keep DB status 'pending' + supervisor_decision='approved'
            'status'                => 'pending',
            // B) or use legacy explicit queue name:
            // 'status'             => 'pending_fleet',
        ]);

        return response()->json(['message'=>'Forwarded to Fleet Manager','data'=>$req->fresh()], 200);
    }

    /**
     * If you keep these explicit endpoints, they now use the same values as above.
     */
    public function supervisorApprove($id, Request $request)
    {
        $user = $request->user();
        $req  = DispatchRequest::findOrFail($id);

        if ((int)$req->ministry_id !== (int)$user->ministry_id) {
            return response()->json(['error'=>'Cross-ministry not allowed'], 403);
        }
        if ($req->supervisor_id && (int)$req->supervisor_id !== (int)$user->id) {
            return response()->json(['error'=>'Only the assigned supervisor can approve'], 403);
        }
        if ($req->status !== 'pending_supervisor') {
            return response()->json(['error'=>'Request is not awaiting supervisor'], 422);
        }

        $data = $request->validate(['note' => 'nullable|string|max:2000']);

        $req->update([
            'supervisor_decision'   => 'approved',
            'supervisor_decided_at' => now(),
            'supervisor_note'       => $data['note'] ?? null,
            'forwarded_to_fleet_at' => now(),
            // see comment in supervisorDecide()
            'status'                => 'pending',
            // 'status'             => 'pending_fleet',
        ]);

        return response()->json(['message'=>'Forwarded to Fleet Manager','data'=>$req->fresh()], 200);
    }

    public function supervisorReject($id, Request $request)
    {
        $user = $request->user();
        $req  = DispatchRequest::findOrFail($id);

        if ((int)$req->ministry_id !== (int)$user->ministry_id) {
            return response()->json(['error'=>'Cross-ministry not allowed'], 403);
        }
        if ($req->supervisor_id && (int)$req->supervisor_id !== (int)$user->id) {
            return response()->json(['error'=>'Only the assigned supervisor can reject'], 403);
        }
        if ($req->status !== 'pending_supervisor') {
            return response()->json(['error'=>'Request is not awaiting supervisor'], 422);
        }

        $data = $request->validate(['note' => 'nullable|string|max:2000']);

        $req->update([
            'supervisor_decision'   => 'denied',          // ✅ not "rejected"
            'supervisor_decided_at' => now(),
            'supervisor_note'       => $data['note'] ?? null,
            'status'                => 'rejected_by_supervisor',
        ]);

        return response()->json(['message'=>'Request rejected','data'=>$req->fresh()], 200);
    }

    /* -------------------- FLEET MANAGER DECISION -------------------- */

}
