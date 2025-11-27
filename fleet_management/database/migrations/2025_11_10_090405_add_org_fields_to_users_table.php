<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Identity / profile
            if (!Schema::hasColumn('users', 'avatar_url')) {
                $table->string('avatar_url', 300)->nullable()->after('password');
            }

            // Org structure (FKs automatically get indexed by MySQL/Laravel)
            if (!Schema::hasColumn('users', 'role_id')) {
                $table->foreignId('role_id')->nullable()->after('avatar_url')
                      ->constrained('roles');
            }

            if (!Schema::hasColumn('users', 'ministry_id')) {
                $table->foreignId('ministry_id')->nullable()->after('role_id')
                      ->constrained('ministries');
            }

            if (!Schema::hasColumn('users', 'department_id')) {
                $table->foreignId('department_id')->nullable()->after('ministry_id')
                      ->constrained('departments')->nullOnDelete();
            }

            if (!Schema::hasColumn('users', 'supervisor_id')) {
                $table->foreignId('supervisor_id')->nullable()->after('department_id')
                      ->constrained('users')->nullOnDelete();
            }

            // Flags
            if (!Schema::hasColumn('users', 'is_first_login')) {
                $table->boolean('is_first_login')->default(true)->after('remember_token');
            }

            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_first_login');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop FKs+columns safely (drops the FK and its index)
            if (Schema::hasColumn('users', 'supervisor_id')) {
                $table->dropConstrainedForeignId('supervisor_id');
            }
            if (Schema::hasColumn('users', 'department_id')) {
                $table->dropConstrainedForeignId('department_id');
            }
            if (Schema::hasColumn('users', 'ministry_id')) {
                $table->dropConstrainedForeignId('ministry_id');
            }
            if (Schema::hasColumn('users', 'role_id')) {
                $table->dropConstrainedForeignId('role_id');
            }

            if (Schema::hasColumn('users', 'avatar_url')) {
                $table->dropColumn('avatar_url');
            }
            if (Schema::hasColumn('users', 'is_first_login')) {
                $table->dropColumn('is_first_login');
            }
            if (Schema::hasColumn('users', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
