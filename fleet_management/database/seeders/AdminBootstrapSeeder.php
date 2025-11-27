<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;
use App\Models\User;
use App\Models\Ministry;
use App\Models\Department;

class AdminBootstrapSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Create a bootstrap ministry WITH a slug
        $ministry = Ministry::updateOrCreate(
            ['slug' => 'default-ministry'], // unique key
            [
                'name'        => 'Default Ministry',
                'slug'        => 'default-ministry',
                'description' => 'Autocreated for bootstrap',
                'created_at'  => $now,
                'updated_at'  => $now,
            ]
        );

        // Seed only the Admin department (as requested)
        $adminDept = Department::updateOrCreate(
            ['ministry_id' => $ministry->id, 'slug' => 'admin'],
            [
                'name'        => 'Admin',
                'description' => 'Administrative department',
                'created_at'  => $now,
                'updated_at'  => $now,
            ]
        );

        // Ministry Admin user
        $minAdminRoleId = Role::where('name', 'Ministry Admin')->value('id');

        User::updateOrCreate(
            ['email' => 'admin@health.gov.ls'],
            [
                'name'           => 'Ministry Admin',
                'password'       => Hash::make('Password@123'),
                'role_id'        => $minAdminRoleId,
                'ministry_id'    => $ministry->id,
                'department_id'  => $adminDept->id,
                'is_first_login' => true,
                'is_active'      => true,
                'created_at'     => $now,
                'updated_at'     => $now,
            ]
        );
    }
}
