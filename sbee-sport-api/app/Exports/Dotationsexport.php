<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DotationsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(protected $dotations) {}

    public function collection()
    {
        return $this->dotations;
    }

    public function headings(): array
    {
        return [
            'Bénéficiaire', 'Section', 'Matériel', 'Quantité',
            'Date remise', 'Date retour prévue', 'Date retour effective',
            'Statut', 'En retard',
        ];
    }

    public function map($dotation): array
    {
        return [
            $dotation->contrat?->personne?->nom_complet ?? '-',
            $dotation->contrat?->section?->nom ?? '-',
            $dotation->stockSection?->typeMateriel?->nom ?? '-',
            $dotation->quantite,
            optional($dotation->date_remise)->format('d/m/Y') ?? '-',
            optional($dotation->date_retour_prevue)->format('d/m/Y') ?? '-',
            optional($dotation->date_retour_effective)->format('d/m/Y') ?? '-',
            $dotation->statut,
            $dotation->estEnRetard() ? 'Oui' : 'Non',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}