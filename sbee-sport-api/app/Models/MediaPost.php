<?php
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
 
class MediaPost extends Model
{
    protected $table = 'medias_posts';
 
    protected $fillable = [
        'post_id', 'type', 'chemin',
        'nom_original', 'mime_type', 'taille_bytes', 'ordre',
    ];
 
    protected $appends = ['url'];
 
    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->chemin);
    }
 
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}