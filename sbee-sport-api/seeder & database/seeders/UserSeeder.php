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
use App\Models\GrillePrime;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();

        $password = Hash::make('SbeeAdmin2026!');

        // ════════════════════════════════════════════
        // 1. DISCIPLINES
        // ════════════════════════════════════════════
        $football   = Discipline::updateOrCreate(['code' => 'FOOT'],
            ['nom' => 'Football',   'type' => 'COLLECTIF']);
        $basketball = Discipline::updateOrCreate(['code' => 'BASK'],
            ['nom' => 'Basketball', 'type' => 'COLLECTIF']);
        $handball   = Discipline::updateOrCreate(['code' => 'HAND'],
            ['nom' => 'Handball',   'type' => 'COLLECTIF']);

        // ════════════════════════════════════════════
        // 2. SECTIONS
        // ════════════════════════════════════════════
        $seniorFoot  = Section::updateOrCreate(
            ['nom' => 'Équipe Sénior Football'],
            ['discipline_id' => $football->id, 'code_analytique' => 'FOOT-SEN-M', 'genre' => 'M']
        );
        $cadetFoot   = Section::updateOrCreate(
            ['nom' => 'Équipe Cadets Football'],
            ['discipline_id' => $football->id, 'code_analytique' => 'FOOT-CAD-M', 'genre' => 'M']
        );
        $seniorBask  = Section::updateOrCreate(
            ['nom' => 'Équipe Sénior Basketball'],
            ['discipline_id' => $basketball->id, 'code_analytique' => 'BASK-SEN-M', 'genre' => 'M']
        );
        $cadetBask   = Section::updateOrCreate(
            ['nom' => 'Équipe Cadets Basketball'],
            ['discipline_id' => $basketball->id, 'code_analytique' => 'BASK-CAD-M', 'genre' => 'M']
        );
        $amazone     = Section::updateOrCreate(
            ['nom' => 'Équipe Amazones Basketball'],
            ['discipline_id' => $basketball->id, 'code_analytique' => 'BASK-CAD-F', 'genre' => 'F']
        );
        $seniorHand  = Section::updateOrCreate(
            ['nom' => 'Équipe Sénior Handball'],
            ['discipline_id' => $handball->id, 'code_analytique' => 'HAND-SEN-M', 'genre' => 'M']
        );
        $cadetHand   = Section::updateOrCreate(
            ['nom' => 'Équipe Cadets Handball'],
            ['discipline_id' => $handball->id, 'code_analytique' => 'HAND-CAD-M', 'genre' => 'M']
        );

        // ════════════════════════════════════════════
        // 3. UTILISATEURS
        // ════════════════════════════════════════════
        // Super Admin
        User::updateOrCreate(['email' => 'admin@sbee.bj'], [
            'nom'          => 'OYENIAN',
            'prenoms'      => 'Sèmine Akanwo',
            'password'     => $password,
            'role_systeme' => 'SUPER_ADMIN',
            'is_actif'     => true,
            'section_id'   => null,
        ]);

        // Trésorier
        User::updateOrCreate(['email' => 'tresorier@sbee.bj'], [
            'nom'          => 'AHOUANSOU',
            'prenoms'      => 'Gilles',
            'password'     => $password,
            'role_systeme' => 'TRESORIER',
            'is_actif'     => true,
            'section_id'   => null,
        ]);

        // Responsable Football
        User::updateOrCreate(['email' => 'resp.foot@sbee.bj'], [
            'nom'          => 'SAGBO',
            'prenoms'      => 'Roland',
            'password'     => $password,
            'role_systeme' => 'RESPONSABLE_SECTION',
            'is_actif'     => true,
            'section_id'   => $seniorFoot->id,
        ]);

        // Coach Football
        $coachFoot = User::updateOrCreate(['email' => 'coach.foot@sbee.bj'], [
            'nom'          => 'DOSSOU',
            'prenoms'      => 'Arnaud',
            'password'     => $password,
            'role_systeme' => 'COACH',
            'is_actif'     => true,
            'section_id'   => $seniorFoot->id,
        ]);

        // Coach Basketball
        $coachBask = User::updateOrCreate(['email' => 'coach.basket@sbee.bj'], [
            'nom'          => 'HOUESSOU',
            'prenoms'      => 'Parfait',
            'password'     => $password,
            'role_systeme' => 'COACH',
            'is_actif'     => true,
            'section_id'   => $seniorBask->id,
        ]);

        // Coach Handball
        $coachHand = User::updateOrCreate(['email' => 'coach.hand@sbee.bj'], [
            'nom'          => 'AGOSSOU',
            'prenoms'      => 'Théodore',
            'password'     => $password,
            'role_systeme' => 'COACH',
            'is_actif'     => true,
            'section_id'   => $seniorHand->id,
        ]);

        // Médecin
        User::updateOrCreate(['email' => 'medecin@sbee.bj'], [
            'nom'          => 'ALAPINI',
            'prenoms'      => 'Romain',
            'password'     => $password,
            'role_systeme' => 'MEDECIN',
            'is_actif'     => true,
            'section_id'   => null,
        ]);

        // Sponsor
        User::updateOrCreate(['email' => 'sponsor@sbee.bj'], [
            'nom'          => 'SBEE',
            'prenoms'      => 'Direction Générale',
            'password'     => $password,
            'role_systeme' => 'SPONSOR',
            'is_actif'     => true,
            'section_id'   => null,
        ]);

        // ════════════════════════════════════════════
        // 4. SAISON
        // ════════════════════════════════════════════
        $saison = Saison::updateOrCreate(
            ['nom' => 'Saison 2025-2026'],
            [
                'date_debut' => '2025-09-01',
                'date_fin'   => '2026-08-31',
                'is_active'  => true,
            ]
        );

        // ════════════════════════════════════════════
        // 5. GRILLES DE PRIMES
        // ════════════════════════════════════════════
        $grilles = [
            // Football
            ['discipline_id' => $football->id, 'type_match' => 'AMICAL',       'resultat' => 'VICTOIRE',  'montant_base' => 15000, 'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $football->id, 'type_match' => 'AMICAL',       'resultat' => 'NUL',       'montant_base' => 8000,  'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $football->id, 'type_match' => 'AMICAL',       'resultat' => 'DEFAITE',   'montant_base' => 5000,  'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $football->id, 'type_match' => 'CHAMPIONNAT',  'resultat' => 'VICTOIRE',  'montant_base' => 25000, 'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $football->id, 'type_match' => 'CHAMPIONNAT',  'resultat' => 'NUL',       'montant_base' => 12000, 'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $football->id, 'type_match' => 'CHAMPIONNAT',  'resultat' => 'DEFAITE',   'montant_base' => 0,     'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $football->id, 'type_match' => 'ENTRAINEMENT', 'resultat' => 'PRESENCE',  'montant_base' => 2000,  'pourcent_remplacant' => 1.0, 'montant_entrainement' => 2000],
            // Basketball
            ['discipline_id' => $basketball->id, 'type_match' => 'AMICAL',     'resultat' => 'VICTOIRE',  'montant_base' => 12000, 'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $basketball->id, 'type_match' => 'AMICAL',     'resultat' => 'NUL',       'montant_base' => 6000,  'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $basketball->id, 'type_match' => 'AMICAL',     'resultat' => 'DEFAITE',   'montant_base' => 0,     'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $basketball->id, 'type_match' => 'ENTRAINEMENT','resultat' => 'PRESENCE', 'montant_base' => 2000,  'pourcent_remplacant' => 1.0, 'montant_entrainement' => 2000],
            // Handball
            ['discipline_id' => $handball->id, 'type_match' => 'AMICAL',       'resultat' => 'VICTOIRE',  'montant_base' => 10000, 'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $handball->id, 'type_match' => 'AMICAL',       'resultat' => 'NUL',       'montant_base' => 5000,  'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $handball->id, 'type_match' => 'AMICAL',       'resultat' => 'DEFAITE',   'montant_base' => 0,     'pourcent_remplacant' => 0.5, 'montant_entrainement' => 0],
            ['discipline_id' => $handball->id, 'type_match' => 'ENTRAINEMENT', 'resultat' => 'PRESENCE',  'montant_base' => 2000,  'pourcent_remplacant' => 1.0, 'montant_entrainement' => 2000],
        ];

        foreach ($grilles as $g) {
            GrillePrime::updateOrCreate(
                [
                    'discipline_id' => $g['discipline_id'],
                    'type_match'    => $g['type_match'],
                    'resultat'      => $g['resultat'],
                ],
                [
                    'montant_base'         => $g['montant_base'],
                    'pourcent_remplacant'  => $g['pourcent_remplacant'],
                    'montant_entrainement' => $g['montant_entrainement'],
                ]
            );
        }

        // ════════════════════════════════════════════
        // 6. JOUEURS DE DÉMONSTRATION (sans Faker)
        // ════════════════════════════════════════════
        $joueurs = [
            // Football Sénior
            ['nom' => 'HOUNKPEVI', 'prenoms' => 'Cédric',   'section' => $seniorFoot, 'poste' => 'Gardien',    'maillot' => 1],
            ['nom' => 'ADJOVI',    'prenoms' => 'Rostand',  'section' => $seniorFoot, 'poste' => 'Défenseur',  'maillot' => 4],
            ['nom' => 'GBAGUIDI',  'prenoms' => 'Narcisse', 'section' => $seniorFoot, 'poste' => 'Milieu',     'maillot' => 8],
            ['nom' => 'AZONDEKON','prenoms' => 'Franck',   'section' => $seniorFoot, 'poste' => 'Attaquant',  'maillot' => 10],
            ['nom' => 'KOUGBLENOU','prenoms' => 'Boris',   'section' => $seniorFoot, 'poste' => 'Défenseur',  'maillot' => 5],
            // Basketball Sénior
            ['nom' => 'AKINDES',   'prenoms' => 'Patrick',  'section' => $seniorBask, 'poste' => 'Meneur',     'maillot' => 7],
            ['nom' => 'SODJI',     'prenoms' => 'Joël',     'section' => $seniorBask, 'poste' => 'Ailier',     'maillot' => 11],
            ['nom' => 'BONI',      'prenoms' => 'Stéphane', 'section' => $seniorBask, 'poste' => 'Pivot',      'maillot' => 14],
            ['nom' => 'GNONLONFOUN','prenoms'=> 'David',   'section' => $seniorBask, 'poste' => 'Arrière',    'maillot' => 3],
            // Handball Sénior
            ['nom' => 'KPADE',     'prenoms' => 'Lionel',   'section' => $seniorHand, 'poste' => 'Gardien',    'maillot' => 1],
            ['nom' => 'TOSSOU',    'prenoms' => 'Venance',  'section' => $seniorHand, 'poste' => 'Ailier G',   'maillot' => 9],
            ['nom' => 'VIGNINOU',  'prenoms' => 'Rodrigue', 'section' => $seniorHand, 'poste' => 'Pivot',      'maillot' => 13],
        ];

        foreach ($joueurs as $j) {
            $personne = Personne::updateOrCreate(
                ['cni_numero' => 'BI-' . strtoupper(substr($j['nom'], 0, 3)) . $j['maillot']],
                [
                    'uuid'                  => (string) Str::uuid(),
                    'nom'                   => $j['nom'],
                    'prenoms'               => $j['prenoms'],
                    'sexe'                  => 'M',
                    'nationalite'           => 'Béninoise',
                    'telephone'             => '+229 97 00 00 ' . str_pad($j['maillot'], 2, '0', STR_PAD_LEFT),
                    'groupe_sanguin'        => 'O+',
                    'allergies'             => 'Aucune',
                    'antecedents_medicaux'  => 'Aucun',
                    'taille_cm'             => 178,
                    'poids_kg'              => 75,
                ]
            );

            Contrat::updateOrCreate(
                ['personne_id' => $personne->id, 'saison_id' => $saison->id],
                [
                    'section_id'                => $j['section']->id,
                    'type_role'                 => 'JOUEUR',
                    'poste_cle'                 => $j['poste'],
                    'numero_maillot'            => $j['maillot'],
                    'numero_licence'            => 'LIC-SBEE-' . $saison->id . '-' . $j['maillot'],
                    'salaire_fixe'              => 0,
                    'prime_signature'           => 0,
                    'mode_paiement'             => 'VIREMENT',
                    'assurance_ref'             => 'NSIA-' . rand(10000, 99999),
                    'statut'                    => 'ACTIF',
                    'certificat_medical_valide' => true,
                    'documents_valides'         => true,
                    'date_debut_contrat'        => $saison->date_debut,
                    'date_fin_contrat'          => $saison->date_fin,
                    'renouvelable'              => true,
                ]
            );
        }

        // ════════════════════════════════════════════
        // 7. ÉVÉNEMENTS DE DÉMONSTRATION
        // ════════════════════════════════════════════
        $evenements = [
            ['section' => $seniorFoot, 'type' => 'MATCH',        'adversaire' => 'ASPAC FC',        'lieu' => 'Stade René Pleven',   'date' => now()->addDays(7)],
            ['section' => $seniorFoot, 'type' => 'ENTRAINEMENT',  'adversaire' => null,              'lieu' => 'Terrain SBEE',        'date' => now()->addDays(2)],
            ['section' => $seniorBask, 'type' => 'MATCH',        'adversaire' => 'Énergie BBC',     'lieu' => 'Hall des Arts',       'date' => now()->addDays(10)],
            ['section' => $seniorBask, 'type' => 'ENTRAINEMENT',  'adversaire' => null,              'lieu' => 'Centre SBEE',         'date' => now()->addDays(3)],
            ['section' => $seniorHand, 'type' => 'MATCH',        'adversaire' => 'Flowers CNSS',    'lieu' => "Stade de l'Amitié",   'date' => now()->addDays(14)],
            ['section' => $seniorHand, 'type' => 'ENTRAINEMENT',  'adversaire' => null,              'lieu' => 'Terrain Hand SBEE',   'date' => now()->addDays(4)],
        ];

        foreach ($evenements as $e) {
            Evenement::updateOrCreate(
                [
                    'section_id'  => $e['section']->id,
                    'type'        => $e['type'],
                    'adversaire'  => $e['adversaire'],
                ],
                [
                    'saison_id'      => $saison->id,
                    'competition_id' => null,
                    'date_heure'     => $e['date']->format('Y-m-d H:i:s'),
                    'lieu'           => $e['lieu'],
                    'resultat'       => 'EN_ATTENTE',
                    'statut'         => 'PLANIFIE',
                    'is_verrouille'  => false,
                    'observations'   => 'Généré automatiquement.',
                ]
            );
        }

        Schema::enableForeignKeyConstraints();

        $this->command->info('✅ Seeder SBEE Sport terminé avec succès !');
        $this->command->info('   📧 admin@sbee.bj / SbeeAdmin2026!');
        $this->command->info('   📧 tresorier@sbee.bj / SbeeAdmin2026!');
        $this->command->info('   📧 coach.foot@sbee.bj / SbeeAdmin2026!');
    }
}