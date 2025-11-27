<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('dispatch_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();

            $table->string('purpose');
            $table->string('origin');
            $table->string('destination');

            $table->dateTime('start_at');
            $table->dateTime('end_at')->nullable();

            $table->enum('status', ['pending','approved','rejected','cancelled','fulfilled'])->default('pending');

            // chosen on approval
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('dispatch_requests'); }
};
