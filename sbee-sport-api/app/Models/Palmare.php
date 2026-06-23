<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Palmare extends Model
{
    protected $fillable = ['personne_id', 'titre', 'annee', 'club_organisation'];

    public function personne() { return $this->belongsTo(Personne::class); }
}
