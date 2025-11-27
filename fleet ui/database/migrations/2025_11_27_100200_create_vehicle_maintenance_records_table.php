<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();

            $table->string('service_type');
            $table->text('description')->nullable();
            $table->unsignedInteger('odometer')->nullable();
            $table->decimal('cost', 12, 2)->nullable();
            $table->date('performed_at')->nullable();
            $table->unsignedInteger('next_service_odometer')->nullable();
            $table->string('document_path')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_maintenance_records');
    }
};

