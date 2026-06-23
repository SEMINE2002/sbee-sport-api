<?php


namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate; // <-- AJOUTE CETTE LIGNE
use Illuminate\Support\Facades\Schema;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // AJOUTE CE BLOC ICI :
        // Donne implicitement toutes les permissions au rôle 'super-admin'
        Gate::before(function ($user, $ability) {
    return $user->hasRole('SUPER_ADMIN') ? true : null;
    });
    }
}