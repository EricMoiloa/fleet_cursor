<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add the column only if it doesn't exist
        if (!Schema::hasColumn('trips', 'request_id')) {
            Schema::table('trips', function (Blueprint $table) {
                $table->unsignedBigInteger('request_id')
                      ->nullable()
                      ->after('id');

                // Name the FK explicitly to avoid name-length issues
                $table->foreign('request_id', 'trips_request_id_fk')
                      ->references('id')
                      ->on('dispatch_requests')
                      ->nullOnDelete(); // sets request_id = NULL if the request is deleted
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('trips', 'request_id')) {
            Schema::table('trips', function (Blueprint $table) {
                // Drop FK first, then column
                $table->dropForeign('trips_request_id_fk');
                $table->dropColumn('request_id');
            });
        }
    }
};
