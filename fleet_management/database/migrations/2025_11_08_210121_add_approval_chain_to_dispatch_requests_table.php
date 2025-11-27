<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            // --- Supervisor stage ---
            if (!Schema::hasColumn('dispatch_requests', 'supervisor_id')) {
                $table->unsignedBigInteger('supervisor_id')->nullable()->after('requested_by');
                $table->foreign('supervisor_id')
                      ->references('id')
                      ->on('users')
                      ->nullOnDelete();
                $table->index('supervisor_id');
            }
            if (!Schema::hasColumn('dispatch_requests', 'supervisor_decision')) {
                // 'approved' | 'rejected' | null
                $table->string('supervisor_decision', 20)->nullable()->after('supervisor_id');
            }
            if (!Schema::hasColumn('dispatch_requests', 'supervisor_decided_at')) {
                $table->timestamp('supervisor_decided_at')->nullable()->after('supervisor_decision');
            }
            if (!Schema::hasColumn('dispatch_requests', 'supervisor_note')) {
                $table->text('supervisor_note')->nullable()->after('supervisor_decided_at');
            }

            // When forwarded to fleet manager (timestamp marker)
            if (!Schema::hasColumn('dispatch_requests', 'forwarded_to_fleet_at')) {
                $table->timestamp('forwarded_to_fleet_at')->nullable()->after('supervisor_note');
            }

            // --- Fleet manager stage ---
            if (!Schema::hasColumn('dispatch_requests', 'fleet_manager_id')) {
                $table->unsignedBigInteger('fleet_manager_id')->nullable()->after('forwarded_to_fleet_at');
                $table->foreign('fleet_manager_id')
                      ->references('id')
                      ->on('users')
                      ->nullOnDelete();
                $table->index('fleet_manager_id');
            }
            if (!Schema::hasColumn('dispatch_requests', 'fleet_decision')) {
                // 'approved' | 'rejected' | null
                $table->string('fleet_decision', 20)->nullable()->after('fleet_manager_id');
            }
            if (!Schema::hasColumn('dispatch_requests', 'fleet_decided_at')) {
                $table->timestamp('fleet_decided_at')->nullable()->after('fleet_decision');
            }
            if (!Schema::hasColumn('dispatch_requests', 'fleet_note')) {
                $table->text('fleet_note')->nullable()->after('fleet_decided_at');
            }

            // NOTE:
            // We are NOT changing 'status' here to avoid breaking existing code.
            // Controllers can map statuses later (e.g., 'pending_supervisor' / 'pending_fleet' / 'approved' / 'rejected').
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            // Drop FKs first, then columns (guard against missing columns)
            if (Schema::hasColumn('dispatch_requests', 'fleet_manager_id')) {
                $table->dropForeign(['fleet_manager_id']);
                $table->dropIndex(['fleet_manager_id']);
            }
            if (Schema::hasColumn('dispatch_requests', 'supervisor_id')) {
                $table->dropForeign(['supervisor_id']);
                $table->dropIndex(['supervisor_id']);
            }

            foreach ([
                'supervisor_id',
                'supervisor_decision',
                'supervisor_decided_at',
                'supervisor_note',
                'forwarded_to_fleet_at',
                'fleet_manager_id',
                'fleet_decision',
                'fleet_decided_at',
                'fleet_note',
            ] as $col) {
                if (Schema::hasColumn('dispatch_requests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
