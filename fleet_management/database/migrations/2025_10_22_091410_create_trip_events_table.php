<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('trip_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['note','incident','checkpoint']);
            $table->text('details')->nullable();
            $table->dateTime('logged_at');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('trip_events'); }
};
