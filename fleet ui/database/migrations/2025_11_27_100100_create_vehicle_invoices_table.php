<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();

            $table->enum('category', ['rental', 'maintenance', 'repair', 'parts'])
                ->default('rental');
            $table->string('invoice_number')->nullable();
            $table->string('vendor_name')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 8)->default('NGN');
            $table->date('invoice_date')->nullable();
            $table->date('due_date')->nullable();
            $table->date('paid_date')->nullable();
            $table->text('notes')->nullable();
            $table->json('line_items')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_invoices');
    }
};

