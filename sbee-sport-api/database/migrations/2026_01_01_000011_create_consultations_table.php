<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personne_id')->constrained('personnes')->onDelete('restrict')
                  ->comment('Le patient soigné');
            $table->foreignId('medecin_contrat_id')->constrained('contrats')->onDelete('restrict')
                  ->comment('RG-MED-01 : Seul MEDECIN peut créer une consultation');
            $table->dateTime('date_consultation');
            $table->string('diagnostic', 255)->nullable();
            $table->enum('type_blessure', [
                'MUSCULAIRE', 'ARTICULAIRE', 'OSSEUSE',
                'CUTANEE', 'NEUROLOGIQUE', 'AUTRE', 'BILAN_ROUTINE'
            ])->nullable();
            $table->unsignedSmallInteger('jours_indisponibilite')->default(0)
                  ->comment('Impact direct sur statut contrat');
            $table->enum('statut_aptitude', ['APTE', 'INAPTE', 'APTE_PARTIEL'])
                  ->default('APTE')
                  ->comment('RG-MED-01 : Ce statut bloque les convocations si INAPTE');
            $table->text('notes_confidentielles')->nullable()
                  ->comment('Visible uniquement par le médecin et Super Admin');
            $table->date('date_reprise_prevue')->nullable();
            $table->timestamps();

            $table->index(['personne_id', 'date_consultation']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
