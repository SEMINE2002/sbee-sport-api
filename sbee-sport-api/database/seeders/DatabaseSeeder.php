<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // Ajoutez ici tous vos seeders dans l'ordre souhaité
            UserSeeder::class,
            RoleSeeder::class,
            CompetitionEtPrimeSeeder::class,
            // TypeMaterielSeeder::class,
        ]);
    }
}