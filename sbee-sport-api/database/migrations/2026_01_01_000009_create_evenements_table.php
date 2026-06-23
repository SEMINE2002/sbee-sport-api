<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evenements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saison_id')->constrained('saisons')->onDelete('restrict');
            $table->foreignId('section_id')->constrained('sections')->onDelete('restrict');
            $table->foreignId('competition_id')->nullable()
                  ->constrained('competitions')->onDelete('set null')
                  ->comment('Nullable si Amical ou Entraînement');
            $table->enum('type', ['MATCH', 'ENTRAINEMENT']);
            $table->dateTime('date_heure');
            $table->string('lieu', 150)->nullable();
            $table->boolean('domicile')->default(true);
            $table->string('adversaire', 150)->nullable()->comment('Null si entraînement');
            $table->unsignedTinyInteger('score_nous')->nullable();
            $table->unsignedTinyInteger('score_adversaire')->nullable();
            $table->enum('resultat', ['VICTOIRE', 'DEFAITE', 'NUL', 'EN_ATTENTE', 'ANNULE'])
                  ->default('EN_ATTENTE');
            $table->boolean('is_verrouille')->default(false)
                  ->comment('RG-SPT-02 : True = calculs figés, aucune modif possible');
            $table->foreignId('valide_par')->nullable()
                  ->constrained('users')->onDelete('set null')
                  ->comment('Coach qui a validé le match');
            $table->timestamp('date_validation')->nullable();
            $table->text('observations')->nullable();
            $table->timestamps();

            $table->index(['section_id', 'saison_id']);
            $table->index(['date_heure']);
        });

        Schema::create('staffing_matchs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evenement_id')->constrained('evenements')->onDelete('cascade');
            $table->foreignId('contrat_id')->constrained('contrats')->onDelete('restrict');
            $table->enum('role_match', ['PRINCIPAL', 'ADJOINT', 'KINE', 'MEDECIN', 'INTENDANT']);
            $table->timestamps();

            $table->unique(['evenement_id', 'contrat_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staffing_matchs');
        Schema::dropIfExists('evenements');
    }
};
