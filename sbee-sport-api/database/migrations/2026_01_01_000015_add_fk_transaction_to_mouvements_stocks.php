<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mouvements_stocks', function (Blueprint $table) {
            $table->foreignId('transaction_id')->nullable()->change();
            $table->foreign('transaction_id')
                  ->references('id')->on('transactions')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('mouvements_stocks', function (Blueprint $table) {
            $table->dropForeign(['transaction_id']);
        });
    }
};
