<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CompetitionEtPrimeSeeder extends Seeder
{
   public function run(): void
    {
        DB::transaction(function () {
            
            // 1. Insertion des Compétitions (Corrigé pour éviter l'erreur de contrainte)
            $competitions = [
                ['saison_id' => 1, 'nom' => 'Ligue Pro', 'type' => 'CHAMPIONNAT', 'niveau' => 'NATIONAL'],
                ['saison_id' => 1, 'nom' => 'Coupe du Bénin', 'type' => 'COUPE', 'niveau' => 'NATIONAL'],
                ['saison_id' => 1, 'nom' => 'Tournoi de la Paix', 'type' => 'TOURNOI', 'niveau' => 'LOCAL'],
            ];

            foreach ($competitions as $comp) {
                DB::table('competitions')->updateOrInsert(
                    ['nom' => $comp['nom']], // Critère de recherche
                    $comp                    // Données à insérer ou mettre à jour
                );
            }

            // 2. Insertion des Grilles de Primes
            $grilles = [
                // FOOTBALL (ID 1)
                [1, 'CHAMPIONNAT', 'VICTOIRE', 50000, 0.50, 0],
                [1, 'CHAMPIONNAT', 'NUL', 25000, 0.50, 0],
                [1, 'CHAMPIONNAT', 'DEFAITE', 10000, 0.50, 0],
                [1, 'COUPE', 'VICTOIRE', 60000, 0.50, 0],
                [1, 'AMICAL', 'VICTOIRE', 10000, 0.50, 0],
                [1, 'ENTRAINEMENT', 'PRESENCE', 0, 0, 2000],

                // BASKETBALL (ID 2)
                [2, 'CHAMPIONNAT', 'VICTOIRE', 40000, 0.50, 0],
                [2, 'CHAMPIONNAT', 'DEFAITE', 10000, 0.50, 0],
                [2, 'COUPE', 'VICTOIRE', 45000, 0.50, 0],
                [2, 'AMICAL', 'VICTOIRE', 8000, 0.50, 0],
                [2, 'ENTRAINEMENT', 'PRESENCE', 0, 0, 1500],

                // HANDBALL (ID 3)
                [3, 'CHAMPIONNAT', 'VICTOIRE', 35000, 0.50, 0],
                [3, 'CHAMPIONNAT', 'NUL', 15000, 0.50, 0],
                [3, 'COUPE', 'VICTOIRE', 40000, 0.50, 0],
                [3, 'AMICAL', 'VICTOIRE', 5000, 0.50, 0],
                [3, 'ENTRAINEMENT', 'PRESENCE', 0, 0, 1500],
            ];

            foreach ($grilles as $g) {
                DB::table('grilles_primes')->updateOrInsert(
                    [
                        'discipline_id' => $g[0],
                        'type_match'    => $g[1],
                        'resultat'      => $g[2]
                    ],
                    [
                        'montant_base'         => $g[3],
                        'pourcent_remplacant'  => $g[4],
                        'montant_entrainement' => $g[5]
                    ]
                );
            }
        });
    }
}