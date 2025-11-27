<?php

namespace App\Http\Controllers;

use App\Models\Ministry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Throwable;

class MinistryController extends Controller
{
    /**
     * GET /api/v1/ministries
     */
    public function index()
    {
        $ministries = Ministry::orderBy('name')->get();

        return response()->json([
            'data' => $ministries,
        ]);
    }

    /**
     * GET /api/v1/ministries/{ministry}
     */
    public function show(Ministry $ministry)
    {
        return response()->json([
            'data' => $ministry,
        ]);
    }

    /**
     * POST /api/v1/ministries
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:150|unique:ministries,name',
            'description' => 'nullable|string',
        ]);

        try {
            $slug = $this->uniqueSlug($data['name']);

            $ministry = Ministry::create([
                'name'        => $data['name'],
                'slug'        => $slug,
                'description' => $data['description'] ?? null,
            ]);

            return response()->json([
                'message' => 'Ministry created',
                'data'    => $ministry,
            ], 201);
        } catch (Throwable $e) {
            // Details are in storage/logs/laravel.log
            return response()->json([
                'message' => 'Failed to create ministry.',
            ], 500);
        }
    }

    /**
     * PUT /api/v1/ministries/{ministry}
     */
    public function update(Request $request, Ministry $ministry)
    {
        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:150|unique:ministries,name,' . $ministry->id,
            'description' => 'nullable|string',
        ]);

        try {
            if (isset($data['name'])) {
                $ministry->name = $data['name'];
                $ministry->slug = $this->uniqueSlug($data['name'], $ministry->id);
            }

            if (array_key_exists('description', $data)) {
                $ministry->description = $data['description'];
            }

            $ministry->save();

            return response()->json([
                'message' => 'Ministry updated',
                'data'    => $ministry,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to update ministry.',
            ], 500);
        }
    }

    /**
     * DELETE /api/v1/ministries/{ministry}
     */
    public function destroy(Ministry $ministry)
    {
        try {
            $ministry->delete();

            return response()->json([
                'message' => 'Ministry deleted',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Failed to delete ministry.',
            ], 500);
        }
    }

    /**
     * Build a unique slug for the given name.
     * If updating, $ignoreId prevents colliding with the same record.
     */
    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        $query = Ministry::query();
        if ($ignoreId) {
            $query->where('id', '<>', $ignoreId);
        }

        while ($query->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
