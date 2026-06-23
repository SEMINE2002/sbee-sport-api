<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EffectifsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(protected $contrats) {}

    public function collection()
    {
        return $this->contrats;
    }

    public function headings(): array
    {
        return [
            'Nom complet', 'Discipline', 'Section', 'Rôle',
            'Poste clé', 'N° Maillot', 'N° Licence', 'Statut',
            'Documents valides', 'Certificat médical valide', 'Date fin contrat',
        ];
    }

    public function map($contrat): array
    {
        return [
            $contrat->personne?->nom_complet ?? '-',
            $contrat->section?->discipline?->nom ?? '-',
            $contrat->section?->nom ?? '-',
            $contrat->type_role,
            $contrat->poste_cle ?? '-',
            $contrat->numero_maillot ?? '-',
            $contrat->numero_licence ?? '-',
            $contrat->statut,
            $contrat->documents_valides ? 'Oui' : 'Non',
            $contrat->certificat_medical_valide ? 'Oui' : 'Non',
            optional($contrat->date_fin_contrat)->format('d/m/Y') ?? '-',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}