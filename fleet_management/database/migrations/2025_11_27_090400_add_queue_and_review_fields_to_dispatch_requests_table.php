<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('dispatch_requests', 'requested_vehicle_type')) {
                $table->string('requested_vehicle_type', 120)->nullable()->after('purpose');
            }

            if (!Schema::hasColumn('dispatch_requests', 'requires_worker_review')) {
                $table->boolean('requires_worker_review')->default(false)->after('status');
            }

            if (!Schema::hasColumn('dispatch_requests', 'queue_position')) {
                $table->unsignedInteger('queue_position')->nullable()->after('requires_worker_review');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            foreach (['requested_vehicle_type', 'requires_worker_review', 'queue_position'] as $column) {
                if (Schema::hasColumn('dispatch_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

