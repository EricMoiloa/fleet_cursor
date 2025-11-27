<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed roles first, then bootstrap a single ministry + Admin dept + one Ministry Admin user.
        $this->call([
            RoleSeeder::class,
            AdminBootstrapSeeder::class,
        ]);
    }
}
