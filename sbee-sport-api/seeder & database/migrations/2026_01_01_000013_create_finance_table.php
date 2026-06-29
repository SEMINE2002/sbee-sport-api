<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saison_id')->constrained('saisons')->onDelete('restrict');
            $table->foreignId('section_id')->constrained('sections')->onDelete('restrict');
            $table->decimal('montant_alloue', 15, 2)->comment('Enveloppe accordée par le trésorier');
            $table->decimal('montant_restant', 15, 2)
                  ->comment('RG-FIN-01 : Mis à jour à chaque transaction validée');
            $table->decimal('montant_depense', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['saison_id', 'section_id']);
            $table->index(['section_id']);
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_section_id')->constrained('budgets_sections')->onDelete('restrict');
            $table->foreignId('evenement_id')->nullable()
                  ->constrained('evenements')->onDelete('set null')
                  ->comment('Nullable : si prime de match, lié à un événement');
            $table->foreignId('contrat_id')->nullable()
                  ->constrained('contrats')->onDelete('set null')
                  ->comment('Si salaire ou prime individuelle');
            $table->enum('type', ['DEBIT', 'CREDIT']);
            $table->enum('categorie', [
                'PRIME_MATCH',
                'PRIME_ENTRAINEMENT',
                'SALAIRE',
                'PRIME_SIGNATURE',
                'ACHAT_MATERIEL',
                'TRANSPORT',
                'HEBERGEMENT',
                'MEDICAL',
                'ARBITRAGE',
                'AUTRE'
            ]);
            $table->decimal('montant', 15, 2);
            $table->string('libelle', 255)->comment('Description courte de la dépense');
            $table->string('justificatif_url', 500)->nullable()
                  ->comment('RG-FIN-03 : Photo obligatoire pour achats');
            $table->enum('statut_validation', [
                'EN_ATTENTE',
                'VALIDE_N1',   // Validé par Responsable Section
                'VALIDE_N2',   // Validé par Trésorier
                'REJETE'
            ])->default('EN_ATTENTE')->comment('RG-FIN-02 : Double validation obligatoire');
            $table->dateTime('date_transaction');
            $table->foreignId('soumis_par')->nullable()
                  ->constrained('users')->onDelete('set null');
            $table->foreignId('valide_n1_par')->nullable()
                  ->constrained('users')->onDelete('set null');
            $table->foreignId('valide_n2_par')->nullable()
                  ->constrained('users')->onDelete('set null')
                  ->comment('RG-FIN-02 : Traçabilité de qui a validé');
            $table->timestamp('date_validation_n1')->nullable();
            $table->timestamp('date_validation_n2')->nullable();
            $table->string('motif_rejet', 255)->nullable();
            $table->timestamps();

            $table->index(['budget_section_id', 'statut_validation']);
            $table->index(['date_transaction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('budgets_sections');
    }
};
