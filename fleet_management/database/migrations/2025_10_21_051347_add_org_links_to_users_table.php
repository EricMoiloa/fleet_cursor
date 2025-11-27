<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add role_id first
            if (!Schema::hasColumn('users', 'role_id')) {
                $table->foreignId('role_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('roles')
                    ->nullOnDelete();
            }

            // Then ministry_id after role_id
            if (!Schema::hasColumn('users', 'ministry_id')) {
                $table->foreignId('ministry_id')
                    ->nullable()
                    ->after('role_id')
                    ->constrained('ministries')
                    ->nullOnDelete();
            }

            // Then department_id after ministry_id
            if (!Schema::hasColumn('users', 'department_id')) {
                $table->foreignId('department_id')
                    ->nullable()
                    ->after('ministry_id')
                    ->constrained('departments')
                    ->nullOnDelete();
            }

            // Flags after password
            if (!Schema::hasColumn('users', 'is_first_login')) {
                $table->boolean('is_first_login')
                    ->default(true)
                    ->after('password');
            }

            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')
                    ->default(true)
                    ->after('is_first_login');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // drop FKs first if they exist, then columns
            if (Schema::hasColumn('users', 'department_id')) {
                $table->dropConstrainedForeignId('department_id');
            }
            if (Schema::hasColumn('users', 'ministry_id')) {
                $table->dropConstrainedForeignId('ministry_id');
            }
            if (Schema::hasColumn('users', 'role_id')) {
                $table->dropConstrainedForeignId('role_id');
            }
            if (Schema::hasColumn('users', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('users', 'is_first_login')) {
                $table->dropColumn('is_first_login');
            }
        });
    }
};
