<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personnes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('nom', 100);
            $table->string('prenoms', 150);
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance', 100)->nullable();
            $table->string('nationalite', 100)->nullable()->default('Béninoise');
            $table->string('cni_numero', 50)->nullable()->unique();
            $table->string('telephone', 20)->nullable();
            $table->string('adresse', 255)->nullable();
            $table->decimal('taille_cm', 5, 2)->nullable();
            $table->decimal('poids_kg', 5, 2)->nullable();
            $table->string('groupe_sanguin', 5)->nullable()->comment('A+, B-, O+...');
            $table->string('allergies', 255)->nullable();
            $table->text('antecedents_medicaux')->nullable();
            $table->string('photo_url', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personnes');
    }
};
