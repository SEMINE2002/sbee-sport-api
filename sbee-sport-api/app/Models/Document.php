<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'personne_id', 'type_document', 'nom_fichier',
        'url_fichier', 'mime_type', 'taille_bytes',
        'date_expiration', 'is_valide', 'uploade_par',
    ];

    protected $casts = [
        'date_expiration' => 'date',
        'is_valide'       => 'boolean',
    ];

    public function personne() { return $this->belongsTo(Personne::class); }
    public function uploadePar() { return $this->belongsTo(User::class, 'uploade_par'); }

    public function estExpire(): bool
    {
        return $this->date_expiration && $this->date_expiration->isPast();
    }
}
