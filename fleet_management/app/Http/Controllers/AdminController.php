<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Models\Ministry;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function register(Request $request)
    {
        $actor = $request->user();

        $data = $request->validate([
            'name'          => ['required','string','max:120'],
            'email'         => ['required','email','unique:users,email'],
            // accept either role_id or role_name (role_name maps to roles.name)
            'role_id'       => ['nullable','exists:roles,id'],
            'role_name'     => ['nullable','string', Rule::exists('roles','name')],
            'ministry_id'   => ['nullable','exists:ministries,id'],
            'department_id' => ['nullable','exists:departments,id'],
        ]);

        // Resolve role by id or by role_name (which maps to roles.name)
        if (empty($data['role_id']) && ! empty($data['role_name'])) {
            $data['role_id'] = Role::where('name', $data['role_name'])->value('id');
        }
        $targetRole = Role::find($data['role_id'] ?? null);
        if (! $targetRole) {
            return response()->json(['error' => 'role_id or valid role_name required'], 422);
        }

        // Actor’s role name (Option A uses roles.name)
        $actorRoleName = optional($actor->role)->name;

        // ====== Actor rules ======
        if ($actorRoleName === 'Ministry Admin') {
            // Ministry Admin cannot create Super Admin or Ministry Admin
            if (in_array($targetRole->name, ['Super Admin', 'Ministry Admin'], true)) {
                return response()->json(['error' => 'Forbidden: Ministry Admin cannot create this role'], 403);
            }

            if (! $actor->ministry_id) {
                return response()->json(['error' => 'Your account has no ministry scope'], 403);
            }

            // Always lock to actor's ministry
            $data['ministry_id'] = $actor->ministry_id;
        }

        if ($actorRoleName === 'Super Admin') {
            // Creating a Ministry Admin requires ministry_id
            if ($targetRole->name === 'Ministry Admin' && empty($data['ministry_id'])) {
                return response()->json(['error' => 'ministry_id is required for Ministry Admin'], 422);
            }
        }

        // ====== Cross-table integrity: department must belong to ministry ======
        $finalMinistryId = $data['ministry_id'] ?? null;

        if (! empty($data['department_id'])) {
            $dept = Department::find($data['department_id']);
            if (! $dept) {
                return response()->json(['error' => 'Invalid department_id'], 422);
            }

            if (! $finalMinistryId) {
                // Infer ministry from department if not provided
                $finalMinistryId = $dept->ministry_id;
                $data['ministry_id'] = $finalMinistryId;
            } else {
                if ((int) $dept->ministry_id !== (int) $finalMinistryId) {
                    return response()->json([
                        'error' => 'department_id does not belong to the specified ministry_id',
                    ], 422);
                }
            }
        }

        if (! empty($finalMinistryId) && ! Ministry::find($finalMinistryId)) {
            return response()->json(['error' => 'Invalid ministry_id'], 422);
        }

        // Create with a temp password; user must change on first login
        $tempPassword = 'TempPass@123';

        $user = User::create([
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password'      => Hash::make($tempPassword),
            'role_id'       => $targetRole->id,
            'ministry_id'   => $finalMinistryId,
            'department_id' => $data['department_id'] ?? null,
            'is_first_login'=> true,
            'is_active'     => true,
        ]);

        // (optional) eager-load role/ministry for response
        $user->load('role', 'ministry', 'department');

        return response()->json([
            'message'       => 'User created',
            'temp_password' => $tempPassword,
            'user'          => $user,
        ], 201);
    }
}
