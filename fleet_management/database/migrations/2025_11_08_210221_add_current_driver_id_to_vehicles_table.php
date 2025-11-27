<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'current_driver_id')) {
                $table->unsignedBigInteger('current_driver_id')->nullable()->after('department_id');
                $table->foreign('current_driver_id')
                      ->references('id')
                      ->on('users')
                      ->nullOnDelete();
                $table->index('current_driver_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (Schema::hasColumn('vehicles', 'current_driver_id')) {
                $table->dropForeign(['current_driver_id']);
                $table->dropIndex(['current_driver_id']);
                $table->dropColumn('current_driver_id');
            }
        });
    }
};
