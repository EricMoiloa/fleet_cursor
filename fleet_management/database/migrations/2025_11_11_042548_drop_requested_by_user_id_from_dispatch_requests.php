<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            // If the old FK exists, drop it safely, then drop the column.
            if (Schema::hasColumn('dispatch_requests', 'requested_by_user_id')) {
                // Safest: try dropping the FK by convention if it exists,
                // then drop the column.
                try {
                    $table->dropForeign(['requested_by_user_id']);
                } catch (\Throwable $e) {
                    // ignore if not present
                }

                // If you're on Laravel 9/10+, you can also try:
                // $table->dropConstrainedForeignId('requested_by_user_id');

                $table->dropColumn('requested_by_user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dispatch_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('dispatch_requests', 'requested_by_user_id')) {
                $table->foreignId('requested_by_user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();
            }
        });
    }
};
