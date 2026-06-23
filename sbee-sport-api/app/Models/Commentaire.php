<?php
// ════════════════════════════════════════════════════
// app/Models/Commentaire.php
// ════════════════════════════════════════════════════
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
 
class Commentaire extends Model
{
    protected $fillable = [
        'post_id', 'contenu', 'pseudonyme',
        'ip_auteur', 'is_valide', 'user_id',
    ];
 
    protected $casts = [
        'is_valide' => 'boolean',
    ];
 
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
 
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}