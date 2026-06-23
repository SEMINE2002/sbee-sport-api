<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Sanction extends Model
{
    protected $fillable = ['participation_id', 'type', 'motif', 'minute_jeu'];

    public function participation() { return $this->belongsTo(Participation::class); }
}
