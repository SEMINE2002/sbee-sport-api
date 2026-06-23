<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasRoles, Notifiable;

    protected $fillable = [
        'personne_id',
        'section_id',
        'name',
        'email',
        'password',
        'role_systeme',
        'is_actif',
        'dernier_login',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'dernier_login'     => 'datetime',
            'password'          => 'hashed',
            'is_actif'          => 'boolean',
        ];
    }

    // -------------------------------------------------------
    // Relations
    // -------------------------------------------------------

    public function personne()
    {
        return $this->belongsTo(Personne::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    // -------------------------------------------------------
    // Helpers rôles
    // -------------------------------------------------------

    public function isSuperAdmin(): bool
    {
        return $this->role_systeme === 'SUPER_ADMIN';
    }

    public function isTresorier(): bool
    {
        return $this->role_systeme === 'TRESORIER';
    }

    public function isResponsableSection(): bool
    {
        return $this->role_systeme === 'RESPONSABLE_SECTION';
    }

    public function isCoach(): bool
    {
        return $this->role_systeme === 'COACH';
    }

    public function isMedecin(): bool
    {
        return $this->role_systeme === 'MEDECIN';
    }

    public function isJoueur(): bool
    {
        return $this->role_systeme === 'JOUEUR';
    }

    public function isSponsor(): bool
    {
        return $this->role_systeme === 'SPONSOR';
    }

    /**
     * Vérifie si l'utilisateur appartient à une section donnée.
     * Clé d'isolation RG-ISO-01
     */
    public function appartientASection(int $sectionId): bool
    {
        if ($this->isSuperAdmin() || $this->isTresorier() || $this->isSponsor()) {
            return true; // Ces rôles voient toutes les sections
        }

        return $this->section_id === $sectionId;
    }

    /**
     * Vérifie si le compte est actif (non bloqué)
     */
    public function estActif(): bool
    {
        return $this->is_actif === true;
    }
}
