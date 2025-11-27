<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * List users visible to the current actor.
     * - Scoped to actor's ministry.
     * - Excludes Ministry Admin accounts from the listing.
     * - Supports ?role=Supervisor|Fleet Manager|Driver|Worker (UI uses "Staff" -> Worker).
     * - Supports ?q= search on name/email.
     */
    public function index(Request $request)
    {
        $actor = $request->user();
        if (!$actor || !$actor->ministry_id) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Normalize role filter from UI ("Staff" => "Worker")
        $roleFilter = trim((string) $request->query('role', ''));
        if (strcasecmp($roleFilter, 'Staff') === 0) {
            $roleFilter = 'Worker';
        }

        $query = User::query()
            ->with(['role', 'department'])
            ->where('ministry_id', $actor->ministry_id)
            // Hide Ministry Admins from this table
            ->whereHas('role', function ($q) {
                $q->where('name', '!=', 'Ministry Admin');
            });

        if ($roleFilter !== '') {
            $query->whereHas('role', function ($q) use ($roleFilter) {
                $q->where('name', $roleFilter);
            });
        }

        if ($search = trim((string) $request->query('q', ''))) {
            $query->where(function ($qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")
                   ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->orderBy('email')->get();

        // Return as a plain array for the UI that expects either [] or {data:[]}
        return response()->json($users);
    }

    /**
     * Update basic fields (Ministry Admin only by routes middleware).
     */
    public function update($id, Request $request)
    {
        $actor = $request->user();
        $user = User::with('role')->findOrFail($id);

        if ((int) $user->ministry_id !== (int) $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden (cross-ministry)'], 403);
        }

        $data = $request->validate([
            'name'          => ['sometimes', 'string', 'max:120'],
            'department_id' => ['sometimes', 'nullable', 'integer', 'exists:departments,id'],
        ]);

        // If role must be department-bound (Supervisor/Worker), enforce dept present
        $roleName = $user->role->name ?? '';
        $needsDept = in_array($roleName, ['Supervisor', 'Worker'], true);

        if (array_key_exists('department_id', $data)) {
            // OK to set null ONLY if role is ministry-wide
            if ($needsDept && is_null($data['department_id'])) {
                return response()->json(['error' => 'Department is required for this role'], 422);
            }
        }

        $user->update($data);

        return $user->fresh()->load('role','department');
    }

    /**
     * Delete a user (Ministry Admin only by routes middleware).
     */
    public function destroy($id, Request $request)
    {
        $actor = $request->user();
        $user = User::findOrFail($id);

        if ((int) $user->ministry_id !== (int) $actor->ministry_id) {
            return response()->json(['error' => 'Forbidden (cross-ministry)'], 403);
        }

        // Don’t allow deleting Ministry Admins through this endpoint (hidden anyway)
        if (optional($user->role)->name === 'Ministry Admin') {
            return response()->json(['error' => 'Cannot delete Ministry Admin'], 422);
        }

        $user->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
