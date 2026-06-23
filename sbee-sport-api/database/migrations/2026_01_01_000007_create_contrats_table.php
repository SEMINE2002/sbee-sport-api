<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personne_id')->constrained('personnes')->onDelete('restrict');
            $table->foreignId('section_id')->constrained('sections')->onDelete('restrict');
            $table->foreignId('saison_id')->constrained('saisons')->onDelete('restrict');
            $table->enum('type_role', ['JOUEUR', 'COACH', 'STAFF', 'MEDECIN', 'INTENDANT']);
            $table->string('poste_cle', 50)->nullable()->comment('Libero, Attaquant, Pivot, Gardien...');
            $table->unsignedTinyInteger('numero_maillot')->nullable();
            $table->string('numero_licence', 50)->nullable()->unique();
            $table->decimal('salaire_fixe', 12, 2)->default(0)->comment('0 si uniquement aux primes');
            $table->decimal('prime_signature', 12, 2)->default(0);
            $table->enum('mode_paiement', ['VIREMENT', 'CHEQUE', 'ESPECES'])->default('VIREMENT');
            $table->string('assurance_ref', 100)->nullable();
            $table->enum('statut', ['ACTIF', 'BLESSE', 'SUSPENDU', 'ARCHIVE'])->default('ACTIF');
            $table->boolean('certificat_medical_valide')->default(false)
                  ->comment('Validation médicale annuelle obligatoire');
            $table->boolean('documents_valides')->default(false)
                  ->comment('RG-RH-01 : Vrai si CNI + Certif OK');
            $table->date('date_debut_contrat');
            $table->date('date_fin_contrat');
            $table->timestamps();

            // Un joueur ne peut avoir qu'un contrat ACTIF par section et saison
            $table->unique(['personne_id', 'section_id', 'saison_id'], 'unique_contrat_actif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrats');
    }
};
