<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Only add what’s missing; safe to run on existing tables
        if (!Schema::hasColumn('dispatch_requests', 'requested_by_user_id')) {
            Schema::table('dispatch_requests', function (Blueprint $table) {
                $table->unsignedBigInteger('requested_by_user_id')->after('department_id');
                $table->index('requested_by_user_id', 'dr_requested_by_user_id_idx');
                $table->foreign('requested_by_user_id')
                      ->references('id')->on('users')
                      ->cascadeOnDelete();
            });
        }

        if (!Schema::hasColumn('dispatch_requests', 'status')) {
            Schema::table('dispatch_requests', function (Blueprint $table) {
                $table->string('status', 50)->default('pending_supervisor')->after('purpose');
            });
        }

        if (!Schema::hasColumn('dispatch_requests', 'approval_chain')) {
            Schema::table('dispatch_requests', function (Blueprint $table) {
                $table->json('approval_chain')->nullable()->after('status');
            });
        }

        if (!Schema::hasColumn('dispatch_requests', 'start_at')) {
            Schema::table('dispatch_requests', function (Blueprint $table) {
                $table->timestamp('start_at')->nullable()->after('approval_chain');
                $table->timestamp('end_at')->nullable()->after('start_at');
            });
        }

        if (!Schema::hasColumn('dispatch_requests', 'preferred_vehicle_id')) {
            Schema::table('dispatch_requests', function (Blueprint $table) {
                $table->unsignedBigInteger('preferred_vehicle_id')->nullable()->after('requested_by_user_id');
                $table->foreign('preferred_vehicle_id')
                      ->references('id')->on('vehicles')
                      ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            if (Schema::hasColumn('dispatch_requests', 'preferred_vehicle_id')) {
                $table->dropForeign(['preferred_vehicle_id']);
                $table->dropColumn('preferred_vehicle_id');
            }
            if (Schema::hasColumn('dispatch_requests', 'requested_by_user_id')) {
                $table->dropForeign(['requested_by_user_id']);
                $table->dropIndex(['dr_requested_by_user_id_idx']);
                $table->dropColumn('requested_by_user_id');
            }
            if (Schema::hasColumn('dispatch_requests', 'start_at')) {
                $table->dropColumn(['start_at','end_at']);
            }
            if (Schema::hasColumn('dispatch_requests', 'approval_chain')) {
                $table->dropColumn('approval_chain');
            }
            if (Schema::hasColumn('dispatch_requests', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
