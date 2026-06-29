<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CoachSeeder extends Seeder
{
    public function run(): void
    {
        // On hache "password" correctement
        $password = Hash::make('password'); 

        $coachs = [
            ['name' => 'Coach Football', 'email' => 'coach.foot@sbee.bj'],
            ['name' => 'Coach Basketball', 'email' => 'coach.basket@sbee.bj'],
            ['name' => 'Coach Handball', 'email' => 'coach.hand@sbee.bj'],
        ];

        foreach ($coachs as $data) {
            User::updateOrCreate(
                ['email' => $data['email']], 
                [
                    'name' => $data['name'],
                    'password' => $password, // Utilisera le hash de "password"
                    'role_systeme' => 'COACH',
                ]
            );
        }
    }
}