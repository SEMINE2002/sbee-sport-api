<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contrats', function (Blueprint $table) {
            // On ajoute le champ booléen avec "true" par défaut pour ne pas bloquer les anciens contrats
            $table->boolean('renouvelable')->default(true)->after('date_fin_contrat');
            $table->text('note_renouvellement')->nullable()->after('renouvelable');
        });
    }

    public function down(): void
    {
        Schema::table('contrats', function (Blueprint $table) {
            $table->dropColumn(['renouvelable', 'note_renouvellement']);
        });
    }
};