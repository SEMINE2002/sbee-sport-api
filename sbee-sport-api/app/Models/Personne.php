<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Personne extends Model
{
    use HasFactory;
    protected static function newFactory()
    {
        return \Database\Factories\PersonneFactory::new();
    }
    protected $fillable = [
        'uuid', 'nom', 'prenoms','sexe', 'date_naissance', 'lieu_naissance',
        'nationalite', 'cni_numero', 'telephone', 'adresse',
        'taille_cm', 'poids_kg', 'groupe_sanguin', 'allergies',
        'antecedents_medicaux', 'photo_url',
    ];
    protected $appends = ['nom_complet'];
    protected $casts = ['date_naissance' => 'date'];

    protected static function booted(): void
    {
        // Génère automatiquement un UUID à la création
        static::creating(fn($p) => $p->uuid ??= (string) Str::uuid());
    }

    public function user() { return $this->hasOne(User::class); }
    public function contrats() { return $this->hasMany(Contrat::class); }
    public function palmares() { return $this->hasMany(Palmare::class); }
    public function documents() { return $this->hasMany(Document::class); }
    public function consultations() { return $this->hasMany(Consultation::class); }

    public function getNomCompletAttribute(): string
    {
        return "{$this->prenoms} {$this->nom}";
    }
}
