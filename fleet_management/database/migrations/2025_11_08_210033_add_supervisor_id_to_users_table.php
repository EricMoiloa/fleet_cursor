<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Put after department_id if it exists; adjust if needed
            if (!Schema::hasColumn('users', 'supervisor_id')) {
                $table->unsignedBigInteger('supervisor_id')->nullable()->after('department_id');
                $table->foreign('supervisor_id')
                      ->references('id')
                      ->on('users')
                      ->nullOnDelete();
                $table->index('supervisor_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'supervisor_id')) {
                $table->dropForeign(['supervisor_id']);
                $table->dropIndex(['supervisor_id']);
                $table->dropColumn('supervisor_id');
            }
        });
    }
};
