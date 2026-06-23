<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ContratsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(protected $contrats) {}

    public function collection()
    {
        return $this->contrats;
    }

    public function headings(): array
    {
        return [
            'Nom complet', 'Discipline', 'Section', 'Saison', 'Rôle',
            'Statut', 'Salaire fixe', 'Prime signature',
            'Date début', 'Date fin', 'Renouvelable',
        ];
    }

    public function map($contrat): array
    {
        return [
            $contrat->personne?->nom_complet ?? '-',
            $contrat->section?->discipline?->nom ?? '-',
            $contrat->section?->nom ?? '-',
            $contrat->saison?->nom ?? '-',
            $contrat->type_role,
            $contrat->statut,
            (float) $contrat->salaire_fixe,
            (float) $contrat->prime_signature,
            optional($contrat->date_debut_contrat)->format('d/m/Y') ?? '-',
            optional($contrat->date_fin_contrat)->format('d/m/Y') ?? '-',
            $contrat->renouvelable ? 'Oui' : 'Non',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}