<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saison_id')->constrained('saisons')->onDelete('restrict');
            $table->string('nom', 150)->comment('ex: Ligue Pro, Coupe du Bénin');
            $table->enum('type', ['CHAMPIONNAT', 'COUPE', 'TOURNOI', 'AMICAL']);
            $table->enum('niveau', ['LOCAL', 'NATIONAL', 'INTERNATIONAL'])->default('NATIONAL');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competitions');
    }
};
