<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // If the main column exists, do nothing (marks migration as run safely)
        if (Schema::hasColumn('dispatch_requests', 'supervisor_decision')) {
            return;
        }

        Schema::table('dispatch_requests', function (Blueprint $t) {
            $t->enum('supervisor_decision', ['pending','approved','denied'])
              ->default('pending')->index();

            // Use singular consistently going forward
            $t->unsignedBigInteger('supervisor_id')->nullable()->index();
            $t->text('supervisor_note')->nullable();
            $t->timestamp('supervisor_decided_at')->nullable();
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
        });
    }
};
