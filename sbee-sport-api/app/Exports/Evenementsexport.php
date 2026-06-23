<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EvenementsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(protected $evenements) {}

    public function collection()
    {
        return $this->evenements;
    }

    public function headings(): array
    {
        return [
            'Date', 'Type', 'Discipline', 'Section', 'Lieu',
            'Domicile/Extérieur', 'Adversaire', 'Score (nous)', 'Score (adversaire)',
            'Résultat', 'Verrouillé',
        ];
    }

    public function map($evenement): array
    {
        return [
            optional($evenement->date_heure)->format('d/m/Y H:i') ?? '-',
            $evenement->type,
            $evenement->section?->discipline?->nom ?? '-',
            $evenement->section?->nom ?? '-',
            $evenement->lieu ?? '-',
            $evenement->domicile ? 'Domicile' : 'Extérieur',
            $evenement->adversaire ?? '-',
            $evenement->score_nous ?? '-',
            $evenement->score_adversaire ?? '-',
            $evenement->resultat ?? '-',
            $evenement->is_verrouille ? 'Oui' : 'Non',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}