<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventaireExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(protected $stocks) {}

    public function collection()
    {
        return $this->stocks;
    }

    public function headings(): array
    {
        return [
            'Discipline', 'Section', 'Matériel',
            'Quantité totale', 'Quantité disponible', 'En dotation',
            'Seuil d\'alerte', 'Statut',
        ];
    }

    public function map($stock): array
    {
        return [
            $stock->section?->discipline?->nom ?? '-',
            $stock->section?->nom ?? '-',
            $stock->typeMateriel?->nom ?? '-',
            $stock->quantite_totale,
            $stock->quantite_disponible,
            $stock->quantite_en_dotation,
            $stock->seuil_alerte,
            $stock->estSousSeuil() ? 'Stock bas' : 'Normal',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}