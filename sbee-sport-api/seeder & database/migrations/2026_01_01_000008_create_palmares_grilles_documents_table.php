<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Palmares
        Schema::create('palmares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personne_id')->constrained('personnes')->onDelete('cascade');
            $table->string('titre', 150)->comment('ex: Champion du Bénin');
            $table->unsignedSmallInteger('annee');
            $table->string('club_organisation', 150)->nullable();
            $table->timestamps();
        });

        // Grilles des primes par discipline
        Schema::create('grilles_primes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discipline_id')->constrained('disciplines')->onDelete('restrict');
            $table->enum('type_match', ['CHAMPIONNAT', 'COUPE', 'TOURNOI', 'AMICAL', 'ENTRAINEMENT']);
            $table->enum('resultat', ['VICTOIRE', 'NUL', 'DEFAITE', 'PRESENCE'])
                  ->comment('PRESENCE pour les entraînements');
            $table->decimal('montant_base', 12, 2)->comment('ex: 20000 FCFA');
            $table->decimal('pourcent_remplacant', 4, 2)->default(0.50)
                  ->comment('50% = remplaçant reçoit 50% du montant_base');
            $table->decimal('montant_entrainement', 12, 2)->default(0)
                  ->comment('Indemnité entraînement si type ENTRAINEMENT');
            $table->timestamps();

            $table->unique(['discipline_id', 'type_match', 'resultat'], 'unique_grille');
        });

        // Documents RH (ajout suggéré - RG-RH-01)
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personne_id')->constrained('personnes')->onDelete('cascade');
            $table->enum('type_document', ['CNI', 'CONTRAT_PDF', 'CERTIFICAT_MEDICAL', 'LICENCE', 'PHOTO', 'AUTRE']);
            $table->string('nom_fichier', 255);
            $table->string('url_fichier', 500);
            $table->string('mime_type', 50)->nullable();
            $table->unsignedInteger('taille_bytes')->nullable();
            $table->date('date_expiration')->nullable()->comment('Pour certificats médicaux annuels');
            $table->boolean('is_valide')->default(true);
            $table->foreignId('uploade_par')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
        Schema::dropIfExists('grilles_primes');
        Schema::dropIfExists('palmares');
    }
};
