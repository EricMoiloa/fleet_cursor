<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('fuel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();

            $table->dateTime('filled_at');
            $table->decimal('litres', 10, 2);
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->decimal('amount', 10, 2)->nullable();
            $table->unsignedInteger('odometer')->nullable();
            $table->string('station')->nullable();

            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('fuel_logs'); }
};
