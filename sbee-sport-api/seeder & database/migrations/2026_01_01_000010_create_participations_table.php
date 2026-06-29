<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evenement_id')->constrained('evenements')->onDelete('restrict');
            $table->foreignId('contrat_id')->constrained('contrats')->onDelete('restrict');
            $table->boolean('is_present')->default(false)
                  ->comment('RG-SPT-01 : Preuve de service, déclenche le calcul de prime');
            $table->boolean('is_titulaire')->default(false)
                  ->comment('False = remplaçant, applique pourcent_remplacant');
            $table->unsignedSmallInteger('minutes_jouees')->nullable();
            $table->decimal('prime_calculee', 12, 2)->nullable()
                  ->comment('Montant figé après validation et verrouillage RG-SPT-02');
            $table->boolean('prime_versee')->default(false);
            $table->timestamps();

            $table->unique(['evenement_id', 'contrat_id']);
            $table->index(['contrat_id']);
        });

        Schema::create('performances_joueurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participation_id')->constrained('participations')->onDelete('cascade');
            $table->string('metrique', 50)->comment('But, Passe, Rebond, Ace, Contre, Point...');
            $table->unsignedSmallInteger('valeur')->default(0);
            $table->timestamps();

            $table->unique(['participation_id', 'metrique']);
        });

        Schema::create('sanctions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participation_id')->constrained('participations')->onDelete('cascade');
            $table->enum('type', ['JAUNE', 'ROUGE', 'BLEU', 'FAUTE_TECHNIQUE', 'EXCLUSION']);
            $table->string('motif', 255)->nullable();
            $table->unsignedSmallInteger('minute_jeu')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanctions');
        Schema::dropIfExists('performances_joueurs');
        Schema::dropIfExists('participations');
    }
};
