<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class NotificationApp extends Model
{
    protected $table = 'notifications_app';
    protected $fillable = [
        'user_id', 'type', 'titre', 'message',
        'url_action', 'is_lue', 'lue_le',
        'notifiable_type', 'notifiable_id',
    ];

    protected $casts = [
        'is_lue' => 'boolean',
        'lue_le' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function notifiable() { return $this->morphTo(); }

    public function marquerLue(): void
    {
        $this->update(['is_lue' => true, 'lue_le' => now()]);
    }
}
