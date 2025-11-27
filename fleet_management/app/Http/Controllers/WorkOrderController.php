<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    // Create a draft work order
    public function store(Request $request)
    {
        $actor = $request->user();

        $data = $request->validate([
            'title'       => 'required|string|max:180',
            'description' => 'nullable|string',
            'vehicle_id'  => 'nullable|integer', // adapt later when vehicles exist
            // Super Admin may specify ministry_id (optional)
            'ministry_id' => 'nullable|exists:ministries,id',
        ]);

        $ministryId = $actor->role->name === 'Super Admin'
            ? ($data['ministry_id'] ?? null)
            : $actor->ministry_id;

        if (!$ministryId) {
            return response()->json(['error' => 'ministry_id is required'], 422);
        }

        $wo = WorkOrder::create([
            'ministry_id' => $ministryId,
            'requested_by'=> $actor->id,
            'vehicle_id'  => $data['vehicle_id'] ?? null,
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'status'      => 'draft',
        ]);

        return response()->json(['message' => 'Work order created', 'data' => $wo], 201);
    }

    // Move to "awaiting_quotes"
    public function sendForQuote(Request $request, $id)
    {
        $actor = $request->user();

        $wo = WorkOrder::findOrFail($id);

        if ($actor->role->name !== 'Super Admin' && $wo->ministry_id !== $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden: wrong ministry'], 403);
        }

        if ($wo->status !== 'draft') {
            return response()->json(['error' => 'Only draft work orders can be sent for quotes'], 422);
        }

        $wo->status = 'awaiting_quotes';
        $wo->save();

        return response()->json(['message' => 'Work order set to awaiting_quotes', 'data' => $wo]);
    }

    // List
    public function index(Request $request)
    {
        $actor = $request->user();

        $query = WorkOrder::query();
        if ($actor->role->name !== 'Super Admin') {
            $query->where('ministry_id', $actor->ministry_id);
        } elseif ($request->filled('ministry_id')) {
            $query->where('ministry_id', $request->query('ministry_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return $query->latest()->paginate(20);
    }
}
