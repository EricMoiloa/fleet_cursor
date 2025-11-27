<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StakeholderController extends Controller
{
    /** Create a Supervisor (department required). */
    public function createSupervisor(Request $request)
    {
        return $this->createInMinistryWithRole($request, 'Supervisor', true, false, null);
    }

    /** Create a Fleet Manager (ministry-wide; no department). */
    public function createFleetManager(Request $request)
    {
        return $this->createInMinistryWithRole($request, 'Fleet Manager', false, true, null);
    }

    /** Create a Driver (ministry-wide; no department). */
    public function createDriver(Request $request)
    {
        return $this->createInMinistryWithRole($request, 'Driver', false, true, null);
    }

    /**
     * Create a Staff (department required) and ATTACH to a Supervisor.
     * BODY: { name, email, department_id, supervisor_id }
     */
    public function createStaff(Request $request)
    {
        return $this->createInMinistryWithRole($request, 'Staff', true, false, 'require-supervisor');
    }

    /**
     * Shared creation logic.
     *
     * @param bool        $requireDepartment  whether department_id is required
     * @param bool        $forceNullDepartment if true, we always store NULL department
     * @param null|string $supervisorRule     'require-supervisor' | null
     */
    protected function createInMinistryWithRole(
        Request $request,
        string $roleName,
        bool $requireDepartment,
        bool $forceNullDepartment,
        ?string $supervisorRule
    ) {
        $actor = $request->user(); // Ministry Admin
        if (!$actor || !$actor->ministry_id) {
            return response()->json(['error' => 'Unauthorized or no ministry scope'], 401);
        }

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:150'],
            'email'         => ['required', 'email', 'max:190', 'unique:users,email'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'supervisor_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        if ($requireDepartment && empty($data['department_id'])) {
            return response()->json(['error' => 'department_id is required for this role'], 422);
        }

        // department must be in same ministry
        if (!empty($data['department_id'])) {
            $dept = Department::find($data['department_id']);
            if (!$dept || (int)$dept->ministry_id !== (int)$actor->ministry_id) {
                return response()->json(['error' => 'department_id does not belong to your ministry'], 422);
            }
        }

        // If staff: supervisor is required and must be a Supervisor in same ministry (and typically same department)
        $supervisorId = null;
        if ($supervisorRule === 'require-supervisor') {
            if (empty($data['supervisor_id'])) {
                return response()->json(['error' => 'supervisor_id is required for Staff'], 422);
            }
            $sup = User::with('role')->find($data['supervisor_id']);
            if (!$sup || ($sup->role->name ?? null) !== 'Supervisor' || (int)$sup->ministry_id !== (int)$actor->ministry_id) {
                return response()->json(['error' => 'supervisor_id must be a Supervisor in your ministry'], 422);
            }
            // If you want to enforce department match:
            if (!empty($data['department_id']) && (int)$sup->department_id !== (int)$data['department_id']) {
                return response()->json(['error' => 'Supervisor must belong to the same department'], 422);
            }
            $supervisorId = $sup->id;
        }

        $roleId = Role::where('name', $roleName)->value('id');
        if (!$roleId) {
            return response()->json(['error' => "Role {$roleName} not found"], 422);
        }

        $deptId = $forceNullDepartment ? null : ($data['department_id'] ?? null);
        $tempPassword = 'Password@123';

        $user = User::create([
            'name'           => $data['name'],
            'email'          => $data['email'],
            'password'       => Hash::make($tempPassword),
            'role_id'        => $roleId,
            'ministry_id'    => $actor->ministry_id,
            'department_id'  => $deptId,
            'supervisor_id'  => $supervisorId,
            'is_first_login' => true,
            'is_active'      => true,
        ])->load('role', 'ministry', 'department');

        return response()->json([
            'message'       => "{$roleName} created",
            'temp_password' => $tempPassword,
            'user'          => $user,
        ], 201);
    }
}
