<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Ensure Super Admin role exists
        $roleId = DB::table('roles')->where('name', 'Super Admin')->value('id');

        // 2) Ministry of Communication
        $ministryId = DB::table('ministries')->updateOrInsert(
            ['name' => 'Ministry of Communication'],
            [
                'slug' => 'ministry-of-communication',
                'description' => 'Oversees communications and technology.',
                'updated_at' => now(), 'created_at' => now()
            ]
        ) ? DB::table('ministries')->where('slug', 'ministry-of-communication')->value('id') : null;

        // 3) Central IT Department (under MoC)
        $deptSlug = 'it-department';
        $departmentId = DB::table('departments')->updateOrInsert(
            ['slug' => $deptSlug, 'ministry_id' => $ministryId],
            [
                'name' => 'IT Department',
                'parent_department_id' => null,
                'updated_at' => now(), 'created_at' => now()
            ]
        ) ? DB::table('departments')->where('slug', $deptSlug)->where('ministry_id', $ministryId)->value('id') : null;

        // 4) Super Admin user
        $email = 'superadmin@communication.go.ke';
        $exists = DB::table('users')->where('email', $email)->exists();

        if (!$exists) {
            DB::table('users')->insert([
                'name'           => 'Super Admin',
                'email'          => $email,
                'password'       => Hash::make('SuperAdmin@123'), // change in prod
                'role_id'        => $roleId,
                'ministry_id'    => $ministryId,
                'department_id'  => $departmentId,
                'is_first_login' => true,
                'is_active'      => true,
                'remember_token' => Str::random(10),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }
    }
}
