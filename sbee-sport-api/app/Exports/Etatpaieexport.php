<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EtatPaieExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(protected $beneficiaires) {}

    public function collection()
    {
        return $this->beneficiaires;
    }

    public function headings(): array
    {
        return ['Bénéficiaire', 'Section', 'Primes', 'Salaire', 'Autres', 'Total'];
    }

    public function map($ligne): array
    {
        return [
            $ligne['personne'],
            $ligne['section'],
            (float) $ligne['primes'],
            (float) $ligne['salaire'],
            (float) $ligne['autres'],
            (float) $ligne['total'],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}