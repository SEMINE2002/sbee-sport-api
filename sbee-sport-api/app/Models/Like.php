<?php
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
 
class Like extends Model
{
    protected $fillable = [
        'post_id', 'ip_auteur', 'session_id', 'user_id',
    ];
 
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
