<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saisons', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100)->comment('ex: Saison 2025-2026');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->boolean('is_active')->default(false)->comment('Une seule saison active à la fois');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saisons');
    }
};
