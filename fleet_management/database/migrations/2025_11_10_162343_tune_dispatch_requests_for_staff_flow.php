<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            // Foreign keys exist differently on each project; add columns first, keys later if you want.

            // Caller ministry/department/user
            if (!Schema::hasColumn('dispatch_requests', 'ministry_id')) {
                $table->unsignedBigInteger('ministry_id')->nullable()->after('id')->index();
            }
            if (!Schema::hasColumn('dispatch_requests', 'department_id')) {
                $table->unsignedBigInteger('department_id')->nullable()->after('ministry_id')->index();
            }
            if (!Schema::hasColumn('dispatch_requests', 'requested_by_user_id')) {
                $table->unsignedBigInteger('requested_by_user_id')->nullable()->after('department_id')->index();
            }

            // Vehicle preference (optional)
            if (!Schema::hasColumn('dispatch_requests', 'preferred_vehicle_id')) {
                $table->unsignedBigInteger('preferred_vehicle_id')->nullable()->after('requested_by_user_id')->index();
            }

            // Status as VARCHAR (accepts pending_supervisor, etc.)
            if (Schema::hasColumn('dispatch_requests', 'status')) {
                // convert to string to avoid enum errors
                $table->string('status', 50)->nullable(false)->change();
            } else {
                $table->string('status', 50)->default('pending')->after('preferred_vehicle_id');
            }

            // Basic trip meta (optional but nice to have)
            if (!Schema::hasColumn('dispatch_requests', 'purpose')) {
                $table->string('purpose', 300)->nullable()->after('status');
            }
            if (!Schema::hasColumn('dispatch_requests', 'origin')) {
                $table->string('origin', 150)->nullable()->after('purpose');
            }
            if (!Schema::hasColumn('dispatch_requests', 'destination')) {
                $table->string('destination', 150)->nullable()->after('origin');
            }

            // Times
            if (!Schema::hasColumn('dispatch_requests', 'start_at')) {
                $table->dateTime('start_at')->nullable()->after('destination');
            }
            if (!Schema::hasColumn('dispatch_requests', 'end_at')) {
                $table->dateTime('end_at')->nullable()->after('start_at');
            }

            // Approval audit trail
            if (!Schema::hasColumn('dispatch_requests', 'approval_chain')) {
                $table->json('approval_chain')->nullable()->after('end_at');
            }

            // Timestamps if missing
            if (!Schema::hasColumn('dispatch_requests', 'created_at')) {
                $table->timestamps();
            }
        });
    }

    public function down(): void
    {
        // Non-destructive down: you can leave it empty, or drop added columns if you prefer.
    }
};
