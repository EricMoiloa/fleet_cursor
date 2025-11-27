<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable();   // add vehicles later
            $table->foreignId('requested_by')->constrained('users'); // Fleet/Driver
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('problem_description')->nullable();
            $table->enum('status', [
                'draft','sent_for_quote','quote_received','approved',
                'in_progress','completed','verified','cancelled'
            ])->default('draft');
            $table->timestamp('needed_by')->nullable();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
