<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Final role list (no Super Admin; Approver/Maintenance removed)
        $roles = [
            ['name' => 'Ministry Admin', 'description' => 'Manages departments, vehicles and users within the ministry.'],
            ['name' => 'Supervisor',     'description' => 'Reviews and approves department requests before Fleet Manager.'],
            ['name' => 'Fleet Manager',  'description' => 'Oversees vehicle operations, approvals and assignments.'],
            ['name' => 'Driver',         'description' => 'Operates vehicles and executes trips.'],
            ['name' => 'Staff',          'description' => 'Regular ministry staff who can request vehicles.'],
        ];

        foreach ($roles as $r) {
            DB::table('roles')->updateOrInsert(
                ['name' => $r['name']],
                ['description' => $r['description'], 'updated_at' => $now, 'created_at' => $now]
            );
        }

        // Clean up deprecated names if they existed
        DB::table('roles')->whereIn('name', ['Super Admin', 'Approver', 'Maintenance'])->delete();
    }
}
