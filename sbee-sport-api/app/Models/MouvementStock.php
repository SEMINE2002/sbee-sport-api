<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class MouvementStock extends Model
{
    protected $table = 'mouvements_stocks';
    protected $fillable = [
        'stock_section_id', 'transaction_id', 'dotation_id',
        'type', 'quantite', 'date_mouv', 'commentaire', 'effectue_par',
    ];

    protected $casts = ['date_mouv' => 'date'];

    public function stockSection() { return $this->belongsTo(StockSection::class); }
    public function transaction() { return $this->belongsTo(Transaction::class); }
    public function dotation() { return $this->belongsTo(Dotation::class); }
    public function effectuePar() { return $this->belongsTo(User::class, 'effectue_par'); }
}
