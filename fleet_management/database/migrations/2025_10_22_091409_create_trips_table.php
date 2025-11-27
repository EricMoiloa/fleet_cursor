<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispatch_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();

            $table->string('purpose');
            $table->string('origin');
            $table->string('destination');

            $table->unsignedInteger('odometer_out')->nullable();
            $table->unsignedInteger('odometer_in')->nullable();
            $table->unsignedInteger('distance')->nullable(); // computed

            $table->enum('status', ['pending','in_progress','completed','cancelled'])->default('pending');

            $table->dateTime('started_at')->nullable();
            $table->dateTime('ended_at')->nullable();

            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('trips'); }
};
