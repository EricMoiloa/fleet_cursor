<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id(); // departments.id
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->string('name');                // "IT Department"
            $table->string('slug')->unique();      // "it-department"
            $table->foreignId('parent_department_id')
                ->nullable()
                ->constrained('departments')       // self reference
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['ministry_id', 'name']); // prevent duplicates per ministry
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
