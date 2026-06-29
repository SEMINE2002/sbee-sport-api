<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // On modifie la table users existante de Laravel
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('personne_id')->nullable()->after('id')
                  ->constrained('personnes')->onDelete('set null');
            $table->foreignId('section_id')->nullable()->after('personne_id')
                  ->constrained('sections')->onDelete('set null')
                  ->comment('Isolation : le responsable ne voit que sa section');
            $table->enum('role_systeme', [
                'SUPER_ADMIN',
                'TRESORIER',
                'RESPONSABLE_SECTION',
                'COACH',
                'MEDECIN',
                'JOUEUR',
                'SPONSOR'
            ])->default('JOUEUR')->after('section_id');
            $table->boolean('is_actif')->default(true)->after('role_systeme')
                  ->comment('Bloquer un accès sans supprimer');
            $table->timestamp('dernier_login')->nullable()->after('is_actif');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['personne_id']);
            $table->dropForeign(['section_id']);
            $table->dropColumn(['personne_id', 'section_id', 'role_systeme', 'is_actif', 'dernier_login']);
        });
    }
};
