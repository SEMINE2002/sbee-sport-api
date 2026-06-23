<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discipline_id')->constrained('disciplines')->onDelete('restrict');
            $table->string('nom', 150)->comment('ex: Equipe A Football, Seniors Basketball');
            // Le champ est maintenant nullable() pour éviter l'erreur 1364
            $table->string('code_analytique', 30)->nullable()->unique()->comment('ex: FOOT-SEN-M');
            $table->enum('genre', ['M', 'F', 'MIXTE'])->default('M');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};