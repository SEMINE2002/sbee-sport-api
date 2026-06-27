<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── Super Admin SBEE ──
        DB::table('users')->insertOrIgnore([
            [
                'nom'           => 'OYENIAN',
                'prenoms'       => 'Sèmine Akanwo',
                'email'         => 'admin@sbee-sport.bj',
                'password'      => Hash::make('SbeeAdmin2026!'),
                'role_systeme'  => 'SUPER_ADMIN',
                'is_actif'      => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'nom'           => 'TRESORIER',
                'prenoms'       => 'SBEE',
                'email'         => 'tresorier@sbee-sport.bj',
                'password'      => Hash::make('Tresorier2026!'),
                'role_systeme'  => 'TRESORIER',
                'is_actif'      => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
    }
}