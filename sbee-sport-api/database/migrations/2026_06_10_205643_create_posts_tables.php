<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Table posts ──
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->text('contenu');
            $table->string('auteur', 100)->default('Anonyme');
            $table->string('discipline', 50)->nullable(); // Football, Basketball, Handball
            $table->string('ip_auteur', 45)->nullable();  // Pour modération
            $table->boolean('is_valide')->default(true);  // Modération
            $table->boolean('is_epingle')->default(false);
            $table->unsignedBigInteger('user_id')->nullable(); // Si connecté
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_valide', 'created_at']);
            $table->index('discipline');
        });

        // ── Table medias_posts ──
        Schema::create('medias_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->enum('type', ['IMAGE', 'VIDEO']);
            $table->string('chemin', 500);       // Chemin relatif storage
            $table->string('nom_original', 255)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('taille_bytes')->nullable();
            $table->integer('ordre')->default(0);
            $table->timestamps();
        });

        // ── Table commentaires ──
        Schema::create('commentaires', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->text('contenu');
            $table->string('pseudonyme', 100)->default('Anonyme');
            $table->string('ip_auteur', 45)->nullable();
            $table->boolean('is_valide')->default(true);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['post_id', 'is_valide', 'created_at']);
        });

        // ── Table likes ──
        Schema::create('likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->string('ip_auteur', 45)->nullable();
            $table->string('session_id', 100)->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();

            // Un like par IP par post
            $table->unique(['post_id', 'ip_auteur']);
            $table->index('post_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('likes');
        Schema::dropIfExists('commentaires');
        Schema::dropIfExists('medias_posts');
        Schema::dropIfExists('posts');
    }
};