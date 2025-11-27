<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();

            $table->string('plate_number')->unique();
            $table->string('vin')->nullable()->unique();     // if available
            $table->string('make')->nullable();
            $table->string('model')->nullable();
            $table->string('type')->nullable();              // sedan, truck, bus...
            $table->integer('capacity')->nullable();         // seats / payload kg

            $table->enum('status', ['available','assigned','in_maintenance','inactive'])->default('available');
            $table->unsignedInteger('odometer')->default(0); // current reading

            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('vehicles'); }
};
