<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // If the main column is already there, skip the whole migration.
        if (Schema::hasColumn('dispatch_requests', 'supervisor_decision')) {
            return;
        }

        Schema::table('dispatch_requests', function (Blueprint $t) {
            $t->enum('supervisor_decision', ['pending','approved','denied'])
              ->default('pending')->index();

            if (!Schema::hasColumn('dispatch_requests', 'supervisor_id')) {
                $t->unsignedBigInteger('supervisor_id')->nullable()->index();
            }
            if (!Schema::hasColumn('dispatch_requests', 'supervisor_note')) {
                $t->text('supervisor_note')->nullable();
            }
            if (!Schema::hasColumn('dispatch_requests', 'supervisor_decided_at')) {
                $t->timestamp('supervisor_decided_at')->nullable();
            }
            if (!Schema::hasColumn('dispatch_requests', 'forwarded_to_fleet_at')) {
                $t->timestamp('forwarded_to_fleet_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $t) {
            if (Schema::hasColumn('dispatch_requests', 'supervisor_decision')) {
                $t->dropColumn('supervisor_decision');
            }
            if (Schema::hasColumn('dispatch_requests', 'supervisor_id')) {
                $t->dropColumn('supervisor_id');
            }
            if (Schema::hasColumn('dispatch_requests', 'supervisor_note')) {
                $t->dropColumn('supervisor_note');
            }
            if (Schema::hasColumn('dispatch_requests', 'supervisor_decided_at')) {
                $t->dropColumn('supervisor_decided_at');
            }
            if (Schema::hasColumn('dispatch_requests', 'forwarded_to_fleet_at')) {
                $t->dropColumn('forwarded_to_fleet_at');
            }
        });
    }
};
