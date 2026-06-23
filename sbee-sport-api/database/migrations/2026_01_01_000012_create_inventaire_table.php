<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Types de matériels (référentiel global)
        Schema::create('types_materiels', function (Blueprint $table) {
            $table->id();
            $table->string('libelle', 100)->comment('ex: Ballon T5, Maillot Domicile, Kit Pharmacie');
            $table->enum('categorie', ['CONSOMMABLE', 'DURABLE'])
                  ->comment('CONSOMMABLE = ruban adhésif, eau. DURABLE = ballon, maillot');
            $table->boolean('recuperable')->default(false)
                  ->comment('RG-INV-01 : True = doit être rendu (maillot, ballon)');
            $table->string('unite', 20)->default('unité')->comment('unité, paire, lot, litre...');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Stock par section (inventaire temps réel)
        Schema::create('stocks_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('sections')->onDelete('restrict');
            $table->foreignId('type_materiel_id')->constrained('types_materiels')->onDelete('restrict');
            $table->unsignedInteger('quantite_totale')->default(0)
                  ->comment('Total acheté/reçu');
            $table->unsignedInteger('quantite_disponible')->default(0)
                  ->comment('RG-INV : Inventaire en temps réel');
            $table->unsignedInteger('quantite_en_dotation')->default(0)
                  ->comment('Matériel sorti chez les joueurs/staff');
            $table->unsignedInteger('seuil_alerte')->default(0)
                  ->comment('Déclenche une notification si quantite_disponible <= seuil');
            $table->timestamps();

            $table->unique(['section_id', 'type_materiel_id']);
        });

        // Dotations : attribution matériel → personne
        Schema::create('dotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrat_id')->constrained('contrats')->onDelete('restrict')
                  ->comment('Le responsable du matériel (joueur ou staff)');
            $table->foreignId('stock_section_id')->constrained('stocks_sections')->onDelete('restrict');
            $table->unsignedInteger('quantite')->default(1);
            $table->date('date_remise');
            $table->date('date_retour_prevue')->nullable();
            $table->date('date_retour_effective')->nullable();
            $table->enum('statut', ['EN_COURS', 'RENDU', 'PERDU_PAYE', 'PERDU_NON_PAYE'])
                  ->default('EN_COURS');
            $table->string('observations', 255)->nullable();
            $table->foreignId('remis_par')->nullable()
                  ->constrained('users')->onDelete('set null')
                  ->comment('User qui a fait la dotation');
            $table->timestamps();

            $table->index(['statut']);
            $table->index(['date_retour_prevue']);
        });

        // Mouvements de stock (historique complet)
        Schema::create('mouvements_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_section_id')->constrained('stocks_sections')->onDelete('restrict');
            $table->foreignId('transaction_id')->nullable()
                  ->comment('Lien optionnel si mouvement lié à un achat financier');
            $table->foreignId('dotation_id')->nullable()
                  ->constrained('dotations')->onDelete('set null')
                  ->comment('Lien si mouvement lié à une dotation');
            $table->enum('type', ['ACHAT', 'PERTE', 'CASSE', 'RETOUR', 'DOTATION', 'AJUSTEMENT'])
                  ->comment('AJUSTEMENT = correction inventaire par admin');
            $table->integer('quantite')->comment('Positif = entrée, Négatif = sortie');
            $table->date('date_mouv');
            $table->string('commentaire', 255)->nullable();
            $table->foreignId('effectue_par')->nullable()
                  ->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['stock_section_id', 'date_mouv']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_stocks');
        Schema::dropIfExists('dotations');
        Schema::dropIfExists('stocks_sections');
        Schema::dropIfExists('types_materiels');
    }
};
