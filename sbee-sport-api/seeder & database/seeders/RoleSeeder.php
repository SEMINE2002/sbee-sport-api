<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset du cache Spatie
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Sécurité : Nettoie les anciens rôles au format minuscules/tirets s'ils existent
        Role::whereIn('name', [
            'super-admin', 'responsable-section', 'tresorier', 
            'coach', 'medecin', 'joueur', 'sponsor'
        ])->delete();

        // --------------------------------------------------------
        // 1. Création des permissions
        // --------------------------------------------------------
        $permissions = [
            // Gestion utilisateurs
            'users.view', 'users.create', 'users.edit', 'users.delete',

            // RH
            'personnes.view', 'personnes.create', 'personnes.edit',
            'contrats.view', 'contrats.create', 'contrats.edit',
            'documents.upload', 'documents.view',

            // Sportif
            'evenements.view', 'evenements.create', 'evenements.edit',
            'evenements.valider',
            'participations.manage',
            'performances.manage',
            'sanctions.manage',

            // Finance
            'budgets.view', 'budgets.manage',
            'transactions.view', 'transactions.create',
            'transactions.valider-n1', 'transactions.valider-n2',
            'grilles-primes.manage',

            // Inventaire
            'stocks.view', 'stocks.manage',
            'dotations.manage',

            // Médical
            'consultations.manage', 'medical.view',

            // Rapports
            'rapports.view', 'rapports.export',
            'rapports.section', 'rapports.global',

            // Sponsor
            'dashboard.sponsor',
            'profil.view',
            'performances.view',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // --------------------------------------------------------
        // 2. Création des rôles en MAJUSCULES (Alignés sur React & API)
        // --------------------------------------------------------

        // Super Admin — toutes les permissions
        $superAdmin = Role::firstOrCreate(['name' => 'SUPER_ADMIN', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        // Trésorier
        $tresorier = Role::firstOrCreate(['name' => 'TRESORIER', 'guard_name' => 'web']);
        $tresorier->syncPermissions([
            'personnes.view', 'contrats.view', 'documents.view',
            'evenements.view',
            'budgets.view', 'budgets.manage',
            'transactions.view', 'transactions.valider-n2',
            'grilles-primes.manage',
            'stocks.view',
            'rapports.view', 'rapports.export', 'rapports.global',
            'users.view',
        ]);

        // Responsable de Section
        $responsable = Role::firstOrCreate(['name' => 'RESPONSABLE_SECTION', 'guard_name' => 'web']);
        $responsable->syncPermissions([
            'personnes.view', 'personnes.create', 'personnes.edit',
            'contrats.view', 'contrats.create', 'contrats.edit',
            'documents.upload', 'documents.view',
            'evenements.view', 'evenements.create', 'evenements.edit',
            'participations.manage',
            'budgets.view',
            'transactions.view', 'transactions.create', 'transactions.valider-n1',
            'stocks.view', 'stocks.manage',
            'dotations.manage',
            'rapports.view', 'rapports.export', 'rapports.section',
        ]);

        // Coach
        $coach = Role::firstOrCreate(['name' => 'COACH', 'guard_name' => 'web']);
        $coach->syncPermissions([
            'evenements.view', 'evenements.valider',
            'participations.manage',
            'performances.manage',
            'sanctions.manage',
            'personnes.view',
            'contrats.view',
            'rapports.section'
        ]);

        // Médecin
        $medecin = Role::firstOrCreate(['name' => 'MEDECIN', 'guard_name' => 'web']);
        $medecin->syncPermissions([
            'consultations.manage', 'medical.view',
            'personnes.view', 'contrats.view',
        ]);

        // Joueur
        $joueur = Role::firstOrCreate(['name' => 'JOUEUR', 'guard_name' => 'web']);
        $joueur->syncPermissions([
            'evenements.view',
            'profil.view',
            'performances.view',
        ]);

        // Sponsor
        $sponsor = Role::firstOrCreate(['name' => 'SPONSOR', 'guard_name' => 'web']);
        $sponsor->syncPermissions([
            'dashboard.sponsor',
            'rapports.view',
        ]);

        // --------------------------------------------------------
        // 3. Assigne le rôle au SUPER_ADMIN par défaut
        // --------------------------------------------------------
        $adminUser = User::where('email', 'admin@sbee-sport.bj')->first();
        if ($adminUser) {
            $adminUser->assignRole('SUPER_ADMIN');
            
            // On s'assure de la synchronisation de l'attribut du modèle si existant
            if (in_array('role_systeme', $adminUser->getFillable()) || isset($adminUser->role_systeme)) {
                $adminUser->update(['role_systeme' => 'SUPER_ADMIN']);
            }
        }

        // Affichage console propre
        $this->command->info('✅ Rôles et permissions créés avec succès.');
        $this->command->table(
            ['Rôle', 'Permissions'],
            [
                ['SUPER_ADMIN', 'Toutes (' . Permission::count() . ')'],
                ['TRESORIER', $tresorier->permissions->count()],
                ['RESPONSABLE_SECTION', $responsable->permissions->count()],
                ['COACH', $coach->permissions->count()],
                ['MEDECIN', $medecin->permissions->count()],
                ['JOUEUR', $joueur->permissions->count()],
                ['SPONSOR', $sponsor->permissions->count()],
            ]
        );
    }
}