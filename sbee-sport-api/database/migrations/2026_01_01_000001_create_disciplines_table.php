<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disciplines', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100);
            $table->string('code', 10)->unique();
            $table->enum('type', ['COLLECTIF', 'INDIVIDUEL'])->default('COLLECTIF');
            $table->string('icone_url', 255)->nullable();
            $table->string('instance_mondiale', 50)->nullable()->comment('FIFA, FIBA, IHF');
            $table->unsignedTinyInteger('nb_joueurs_terrain')->nullable()->comment('11, 7, 5');
            $table->unsignedSmallInteger('duree_match_minutes')->nullable()->comment('90, 60, 40');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disciplines');
    }
};
