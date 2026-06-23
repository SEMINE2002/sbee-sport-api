<?php

namespace Database\Seeders;

use App\Models\TypeMateriel;
use Illuminate\Database\Seeder;

class TypeMaterielSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $materiels = [
            // --- MATÉRIELS DURABLES (RÉCUPÉRABLES) ---
            [
                'libelle' => 'Ballon de Football Officiel (Taille 5)',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'unités',
                'description' => 'Ballon de match homologué pour la section Football.',
            ],
            [
                'libelle' => 'Ballon de Basketball Molten (Taille 7)',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'unités',
                'description' => 'Ballon en cuir pour les compétitions de la section Basket.',
            ],
            [
                'libelle' => 'Maillot Officiel SBEE (Vert - Domicile)',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'unités',
                'description' => 'Maillot officiel de compétition avec logo SBEE, attribué pour la saison.',
            ],
            [
                'libelle' => 'Short Officiel SBEE (Blanc)',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'unités',
                'description' => 'Short officiel de compétition.',
            ],
            [
                'libelle' => 'Chasubles d\'entraînement (Lot de 10)',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'lots',
                'description' => 'Chasubles fluo pour la séparation des équipes à l\'entraînement.',
            ],
            [
                'libelle' => 'Plots et Cônes d\'entraînement (Lot de 20)',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'lots',
                'description' => 'Matériel logistique pour les ateliers techniques.',
            ],
            [
                'libelle' => 'Filet de Volley-ball de compétition',
                'categorie' => 'DURABLE',
                'recuperable' => true,
                'unite' => 'unités',
                'description' => 'Filet réglementaire pour la section Volley.',
            ],

            // --- MATÉRIELS CONSOMMABLES (NON RÉCUPÉRABLES) ---
            [
                'libelle' => 'Trousse de Premiers Secours / Pharmacie',
                'categorie' => 'CONSOMMABLE',
                'recuperable' => false,
                'unite' => 'unités',
                'description' => 'Bombe de froid, bandages, compresses pour l\'équipe médicale.',
            ],
            [
                'libelle' => 'Carton de bouteilles d\'eau minérale',
                'categorie' => 'CONSOMMABLE',
                'recuperable' => false,
                'unite' => 'cartons',
                'description' => 'Hydratation des joueurs lors des entraînements et des matchs.',
            ],
            [
                'libelle' => 'Paire de chaussettes de match (Vertes)',
                'categorie' => 'CONSOMMABLE',
                'recuperable' => false,
                'unite' => 'paires',
                'description' => 'Chaussettes de compétition (considérées comme consommables par joueur).',
            ],
            [
                'libelle' => 'Bande de strapping / Kinesio',
                'categorie' => 'CONSOMMABLE',
                'recuperable' => false,
                'unite' => 'rouleaux',
                'description' => 'Matériel de contention pour les blessures légères.',
            ]
        ];

        foreach ($materiels as $mat) {
            TypeMateriel::create($mat);
        }
    }
}