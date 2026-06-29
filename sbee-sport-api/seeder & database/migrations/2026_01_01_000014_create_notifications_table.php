<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications_app', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade')
                  ->comment('Destinataire de la notification');
            $table->enum('type', [
                'CONTRAT_EXPIRE_BIENTOT',   // 30j avant fin contrat
                'CERTIFICAT_EXPIRE',         // Certificat médical expiré
                'BUDGET_DEPASSE',            // Budget section insuffisant
                'MATERIEL_NON_RENDU',        // Dotation non rendue après date prévue
                'TRANSACTION_EN_ATTENTE',    // Dépense à valider
                'MATCH_A_VALIDER',           // Coach doit valider résultat
                'DOCUMENTS_MANQUANTS',       // CNI ou certificat manquant
                'STOCK_BAS',                 // Seuil alerte inventaire atteint
                'PRIME_VERSEE',              // Prime calculée et approuvée
                'AUTRE'
            ]);
            $table->string('titre', 150);
            $table->text('message');
            $table->string('url_action', 255)->nullable()->comment('Lien vers la page concernée');
            $table->boolean('is_lue')->default(false);
            $table->timestamp('lue_le')->nullable();
            $table->morphs('notifiable');
            $table->timestamps();

            $table->index(['user_id', 'is_lue']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications_app');
    }
};
