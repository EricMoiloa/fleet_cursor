<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DepartmentController extends Controller
{
    /**
     * List departments in the current Ministry Admin's ministry.
     */
    public function index(Request $request)
    {
        $admin = $request->user();

        if ($admin->role?->name !== 'Ministry Admin' || !$admin->ministry_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $items = Department::where('ministry_id', $admin->ministry_id)
            ->orderBy('name')
            ->get();

        return response()->json($items);
    }

    /**
     * Create a department within the admin's ministry.
     */
    public function store(Request $request)
    {
        $admin = $request->user();

        if ($admin->role?->name !== 'Ministry Admin' || !$admin->ministry_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:150',
            'parent_department_id' => 'nullable|exists:departments,id',
        ]);

        // Ensure parent (if provided) belongs to same ministry
        if (!empty($data['parent_department_id'])) {
            $parent = Department::find($data['parent_department_id']);
            if ((int) $parent->ministry_id !== (int) $admin->ministry_id) {
                return response()->json([
                    'error' => 'parent_department_id must belong to your ministry',
                ], 422);
            }
        }

        // Enforce unique (ministry_id, name)
        $exists = Department::where('ministry_id', $admin->ministry_id)
            ->where('name', $data['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'The department name has already been taken in your ministry.',
                'errors'  => ['name' => ['Duplicate department name in this ministry.']],
            ], 422);
        }

        $dept = Department::create([
            'ministry_id'          => $admin->ministry_id,
            'name'                 => $data['name'],
            'slug'                 => Str::slug($data['name']),
            'parent_department_id' => $data['parent_department_id'] ?? null,
        ]);

        return response()->json(['message' => 'Department created', 'data' => $dept], 201);
    }

    /**
     * Update a department (still scoped to admin's ministry).
     */
    public function update(Request $request, $id)
    {
        $admin = $request->user();

        if ($admin->role?->name !== 'Ministry Admin' || !$admin->ministry_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $dept = Department::where('ministry_id', $admin->ministry_id)->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'parent_department_id' => 'nullable|exists:departments,id',
        ]);

        if (isset($data['name'])) {
            $duplicate = Department::where('ministry_id', $admin->ministry_id)
                ->where('name', $data['name'])
                ->where('id', '!=', $dept->id)
                ->exists();

            if ($duplicate) {
                return response()->json([
                    'message' => 'The department name has already been taken in your ministry.',
                    'errors'  => ['name' => ['Duplicate department name in this ministry.']],
                ], 422);
            }

            $dept->name = $data['name'];
            $dept->slug = Str::slug($data['name']);
        }

        if (array_key_exists('parent_department_id', $data)) {
            if ($data['parent_department_id']) {
                $parent = Department::find($data['parent_department_id']);
                if ((int) $parent->ministry_id !== (int) $admin->ministry_id) {
                    return response()->json([
                        'error' => 'parent_department_id must belong to your ministry',
                    ], 422);
                }
            }
            $dept->parent_department_id = $data['parent_department_id'];
        }

        $dept->save();

        return response()->json(['message' => 'Department updated', 'data' => $dept]);
    }

    /**
     * Delete a department (scoped).
     */
    public function destroy(Request $request, $id)
    {
        $admin = $request->user();

        if ($admin->role?->name !== 'Ministry Admin' || !$admin->ministry_id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $dept = Department::where('ministry_id', $admin->ministry_id)->findOrFail($id);
        $dept->delete();

        return response()->json(['message' => 'Department deleted']);
    }
}
