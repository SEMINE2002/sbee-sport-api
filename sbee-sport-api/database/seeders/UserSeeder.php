<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Personne;
use App\Models\Contrat;
use App\Models\Saison;
use App\Models\Discipline;
use App\Models\Section;    
use App\Models\Evenement;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use Faker\Factory as Faker;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Désactivation totale au niveau DB pour éviter tout conflit de clés
        Schema::disableForeignKeyConstraints();

        $defaultPassword = Hash::make('password');
        $faker = Faker::create('fr_FR');

        // 1. --- DISCIPLINES ---
        Discipline::updateOrCreate(['id' => 2], ['nom' => 'Football', 'code' => 'FOOT', 'type' => 'COLLECTIF']);
        Discipline::updateOrCreate(['id' => 3], ['nom' => 'Basketball', 'code' => 'BASK', 'type' => 'COLLECTIF']);
        Discipline::updateOrCreate(['id' => 4], ['nom' => 'Handball', 'code' => 'HAND', 'type' => 'COLLECTIF']);

        // 2. --- SECTIONS ---
        $seniorFoot = Section::updateOrCreate(['nom' => 'Equipe Sénior Foot'], ['discipline_id' => 2, 'code_analytique' => 'FOOT-SEN-M', 'genre' => 'M']);
        $cadetFoot  = Section::updateOrCreate(['nom' => 'Equipe Cadets Foot'], ['discipline_id' => 2, 'code_analytique' => 'FOOT-CAD-M', 'genre' => 'M']);
        
        $seniorBask = Section::updateOrCreate(['nom' => 'Equipe Sénior Basket'], ['discipline_id' => 3, 'code_analytique' => 'BASK-SEN-M', 'genre' => 'M']);
        $cadetBask  = Section::updateOrCreate(['nom' => 'Equipe Cadets Basket'], ['discipline_id' => 3, 'code_analytique' => 'BASK-CAD-M', 'genre' => 'M']);
        $amazoneBask= Section::updateOrCreate(['nom' => 'Equipe Cadets Basket Amazone'], ['discipline_id' => 3, 'code_analytique' => 'BASK-CAD-F', 'genre' => 'F']);
        
        $seniorHand = Section::updateOrCreate(['nom' => 'Equipe Senior Hand'], ['discipline_id' => 4, 'code_analytique' => 'HAND-SEN-M', 'genre' => 'M']);
        $cadetHand  = Section::updateOrCreate(['nom' => 'Equipe Cadets Hand'], ['discipline_id' => 4, 'code_analytique' => 'HAND-CAD-M', 'genre' => 'M']);

        $createdSectionsIds = [
            $seniorFoot->id, $cadetFoot->id, 
            $seniorBask->id, $cadetBask->id, $amazoneBask->id, 
            $seniorHand->id, $cadetHand->id
        ];

        // 3. --- UTILISATEURS ---
        User::updateOrCreate(['email' => 'admin@sbee.bj'], [
            'name' => 'Super Admin', 'password' => $defaultPassword, 'role_systeme' => 'SUPER_ADMIN', 'section_id' => null
        ]);

        $coachFoot = User::updateOrCreate(['email' => 'coach.foot@sbee.bj'], [
            'name' => 'Coach Football', 'password' => $defaultPassword, 'role_systeme' => 'COACH', 'section_id' => null
        ]);

        $coachBasket = User::updateOrCreate(['email' => 'coach.basket@sbee.bj'], [
            'name' => 'Coach Basketball', 'password' => $defaultPassword, 'role_systeme' => 'COACH', 'section_id' => null
        ]);

        $coachHand = User::updateOrCreate(['email' => 'coach.hand@sbee.bj'], [
            'name' => 'Coach Handball', 'password' => $defaultPassword, 'role_systeme' => 'COACH', 'section_id' => null
        ]);

        User::updateOrCreate(['email' => 'medecin@sbee.bj'], [
            'name' => 'Dr. Alapini', 'password' => $defaultPassword, 'role_systeme' => 'MEDECIN', 'section_id' => null
        ]);

        // Liaison des coachs
        if ($seniorFoot->id) $coachFoot->update(['section_id' => $seniorFoot->id]);
        if ($seniorBask->id) $coachBasket->update(['section_id' => $seniorBask->id]);
        if ($seniorHand->id) $coachHand->update(['section_id' => $seniorHand->id]);

        // 4. --- SAISON (Correction : Retrait du champ 'statut') ---
        $saison = Saison::where('nom', 'LIKE', '%2026-2027%')->first();
        if (!$saison) {
            $saison = Saison::create([
                'nom'        => 'Saison 2026-2027', 
                'date_debut' => '2026-05-15', 
                'date_fin'   => '2027-05-15'
            ]);
        }

        // 5. --- JOUEURS ---
        $postesDefaut = ['Attaquant', 'Défenseur', 'Milieu', 'Gardien', 'Pivot', 'Ailier', 'Meneur'];
        $assurancesDispo = ['NSIA-SP-', 'SANLAM-SP-', 'SUNU-SP-', 'AMEN-SP-'];
        $groupesSanguins = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

        for ($i = 0; $i < 100; $i++) {
            $personne = Personne::create([
                'uuid'                 => (string) Str::uuid(),
                'nom'                  => strtoupper($faker->lastName),
                'prenoms'              => $faker->firstName,
                'sexe'                 => $faker->randomElement(['M', 'F']),
                'date_naissance'       => $faker->date('Y-m-d', '2008-01-01'),
                'lieu_naissance'       => $faker->city,
                'nationalite'          => 'Béninoise',
                'cni_numero'           => 'BI-' . rand(10000000, 99999999),
                'telephone'            => '+229 ' . rand(40, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99),
                'adresse'              => $faker->address,
                'taille_cm'            => rand(165, 205),
                'poids_kg'             => rand(60, 110),
                'groupe_sanguin'       => $faker->randomElement($groupesSanguins),
                'allergies'            => 'Aucune',
                'antecedents_medicaux' => 'Aucun',
            ]);

            $sectionIdAleatoire = $faker->randomElement($createdSectionsIds);
            $refAssurance = $assurancesDispo[array_rand($assurancesDispo)] . rand(10000, 99999);

            Contrat::create([
                'personne_id'               => $personne->id,
                'section_id'                => $sectionIdAleatoire, 
                'saison_id'                 => $saison->id,
                'type_role'                 => 'JOUEUR',    
                'poste_cle'                 => $postesDefaut[array_rand($postesDefaut)],
                'numero_maillot'            => rand(1, 99),
                'numero_licence'            => 'LIC-' . rand(100000, 999999),
                'salaire_fixe'              => rand(50000, 250000), 
                'prime_signature'           => rand(100000, 500000),
                'mode_paiement'             => 'VIREMENT',  
                'assurance_ref'             => $refAssurance,
                'statut'                    => 'ACTIF',     
                'certificat_medical_valide' => true,
                'documents_valides'         => true,
                'date_debut_contrat'        => '2026-05-15',
                'date_fin_contrat'          => '2027-05-15',
                'renouvelable'              => true,
            ]);
        }

        // 6. --- ÉVÉNEMENTS ---
        if ($seniorFoot->id && $seniorBask->id && $seniorHand->id) {
            $evenementsParSection = [
                $seniorFoot->id => [
                    ['type' => 'MATCH', 'adversaire' => 'ASPAC FC', 'lieu' => 'Stade René Pleven'],
                    ['type' => 'ENTRAINEMENT', 'adversaire' => null, 'lieu' => 'Terrain SBEE']
                ],
                $seniorBask->id => [
                    ['type' => 'MATCH', 'adversaire' => 'Énergie BBC', 'lieu' => 'Hall des Arts'],
                    ['type' => 'ENTRAINEMENT', 'adversaire' => null, 'lieu' => 'Centre SBEE']
                ],
                $seniorHand->id => [
                    ['type' => 'MATCH', 'adversaire' => 'Flowers CNSS', 'lieu' => 'Stade de l\'Amitié'],
                    ['type' => 'ENTRAINEMENT', 'adversaire' => null, 'lieu' => 'Terrain de Hand SBEE']
                ]
            ];

            foreach ($evenementsParSection as $sectionId => $evenements) {
                foreach ($evenements as $evt) {
                    Evenement::create([
                        'saison_id'        => $saison->id,
                        'section_id'       => $sectionId, 
                        'competition_id'   => null,
                        'type'             => $evt['type'],
                        'date_heure'       => $faker->dateTimeBetween('now', '+1 month')->format('Y-m-d H:i:s'),
                        'lieu'             => $evt['lieu'],
                        'adversaire'       => $evt['adversaire'],
                        'score_nous'       => null,
                        'score_adversaire' => null,
                        'resultat'         => 'EN_ATTENTE',
                        'is_verrouille'    => false,
                        'observations'     => 'Généré par le système.',
                    ]);
                }
            }
        }

        Schema::enableForeignKeyConstraints();
    }
}