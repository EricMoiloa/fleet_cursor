<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('dispatch_requests', 'requested_vehicle_type')) {
                $table->string('requested_vehicle_type')
                    ->nullable()
                    ->after('vehicle_id');
            }

            if (!Schema::hasColumn('dispatch_requests', 'preferred_vehicle_id')) {
                $table->foreignId('preferred_vehicle_id')
                    ->nullable()
                    ->after('requested_vehicle_type')
                    ->constrained('vehicles')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('dispatch_requests', 'queue_position')) {
                $table->unsignedInteger('queue_position')
                    ->default(0)
                    ->after('preferred_vehicle_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            if (Schema::hasColumn('dispatch_requests', 'preferred_vehicle_id')) {
                $table->dropForeign(['preferred_vehicle_id']);
                $table->dropColumn('preferred_vehicle_id');
            }

            foreach (['requested_vehicle_type', 'queue_position'] as $column) {
                if (Schema::hasColumn('dispatch_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

