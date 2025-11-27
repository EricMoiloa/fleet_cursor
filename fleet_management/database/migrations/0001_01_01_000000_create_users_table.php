<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();                               // BIGINT PK (user id)
            $table->string('name');                     // user's display name
            $table->string('email')->unique();          // email (unique)
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');                 // hashed password
            $table->rememberToken();                    // remember_me token
            $table->timestamps();                       // created_at / updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
