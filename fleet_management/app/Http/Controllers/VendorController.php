<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    // Create a vendor (Super Admin or Ministry Admin)
    public function store(Request $request)
    {
        $actor = $request->user();

        $data = $request->validate([
            'name'          => 'required|string|max:150',
            'contact_email' => 'nullable|email|max:150',
            'phone'         => 'nullable|string|max:50',
        ]);

        $ministryId = $actor->role->name === 'Super Admin'
            ? ($request->validate(['ministry_id' => 'required|exists:ministries,id']))['ministry_id']
            : $actor->ministry_id;

        $vendor = Vendor::create([
            'ministry_id'   => $ministryId,
            'name'          => $data['name'],
            'contact_email' => $data['contact_email'] ?? null,
            'phone'         => $data['phone'] ?? null,
        ]);

        return response()->json(['message' => 'Vendor created', 'data' => $vendor], 201);
    }

    // List vendors scoped to the actor's ministry
    public function index(Request $request)
    {
        $actor = $request->user();

        $query = Vendor::query();
        if ($actor->role->name !== 'Super Admin') {
            $query->where('ministry_id', $actor->ministry_id);
        } elseif ($request->filled('ministry_id')) {
            $query->where('ministry_id', $request->query('ministry_id'));
        }

        return $query->orderBy('name')->paginate(20);
    }
}
