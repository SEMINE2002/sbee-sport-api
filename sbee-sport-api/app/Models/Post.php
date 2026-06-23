<?php
// ════════════════════════════════════════════════════
// app/Models/Post.php
// ════════════════════════════════════════════════════
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Post extends Model
{
    protected $fillable = [
        'contenu', 'auteur', 'discipline',
        'ip_auteur', 'is_valide', 'is_epingle', 'user_id',
    ];

    protected $casts = [
        'is_valide'  => 'boolean',
        'is_epingle' => 'boolean',
    ];

    // ── Relations ──
    public function medias()
    {
        return $this->hasMany(MediaPost::class)->orderBy('ordre');
    }

    public function commentaires()
    {
        return $this->hasMany(Commentaire::class)
            ->where('is_valide', true)
            ->orderBy('created_at');
    }

    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ── Appends ──
    protected $appends = ['nb_likes', 'nb_commentaires', 'liked'];

    public function getNbLikesAttribute(): int
    {
        return $this->likes()->count();
    }

    public function getNbCommentairesAttribute(): int
    {
        return $this->commentaires()->count();
    }

    public function getLikedAttribute(): bool
    {
        $ip = request()->ip();
        return $this->likes()->where('ip_auteur', $ip)->exists();
    }

    // ── Scope ──
    public function scopeValide($query)
    {
        return $query->where('is_valide', true);
    }

    public function scopeDiscipline($query, $disc)
    {
        return $disc ? $query->where('discipline', $disc) : $query;
    }
}