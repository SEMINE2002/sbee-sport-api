<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
  {
    Schema::table('personnes', function (Blueprint $table) {
        // On l'ajoute après les prénoms, avec 'M' par défaut
        $table->enum('sexe', ['M', 'F'])->default('M')->after('prenoms');
    });
   }

   public function down(): void
  {
    Schema::table('personnes', function (Blueprint $table) {
        $table->dropColumn('sexe');
    });
  }
};
