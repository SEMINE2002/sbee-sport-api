<?php

namespace App\Exports;

use App\Models\BudgetSection;
use App\Models\Transaction;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class BilanFinancierExport implements WithMultipleSheets
{
    public function __construct(private int $saisonId) {}

    public function sheets(): array
    {
        $sheets = [new BilanGlobalSheet($this->saisonId)];

        // Un onglet par section
        $budgets = BudgetSection::with('section')
            ->where('saison_id', $this->saisonId)
            ->get();

        foreach ($budgets as $budget) {
            $sheets[] = new DetailSectionSheet($budget);
        }

        return $sheets;
    }
}

// -------------------------------------------------------
// Feuille 1 : Bilan Global
// -------------------------------------------------------
class BilanGlobalSheet implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle, WithColumnFormatting, WithEvents
{
    public function __construct(private int $saisonId) {}

    public function title(): string { return 'Bilan Global'; }

    public function collection()
    {
        return BudgetSection::with(['section.discipline'])
            ->where('saison_id', $this->saisonId)
            ->get();
    }

    public function headings(): array
    {
        return [
            'Section',
            'Discipline',
            'Budget Alloué (FCFA)',
            'Dépensé (FCFA)',
            'Restant (FCFA)',
            '% Consommé',
        ];
    }

    public function map($budget): array
    {
        return [
            $budget->section->nom,
            $budget->section->discipline->nom ?? 'N/A',
            (float) $budget->montant_alloue,
            (float) $budget->montant_depense,
            (float) $budget->montant_restant,
            ($budget->pourcentageConsomme() / 100),
        ];
    }

    public function columnFormats(): array
    {
        return [
            'C' => '#,##0',
            'D' => '#,##0',
            'E' => '#,##0',
            'F' => '0.0%',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        // Style de l'en-tête (Rouge SBEE #ED1F24)
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'name' => 'Arial', 'size' => 11],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ED1F24']],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->setShowGridLines(true); // Assure l'affichage du quadrillage

                $highestRow = $sheet->getHighestRow();
                $highestColumn = $sheet->getHighestColumn();
                
                // Application de la police et des bordures sur tout le tableau
                $sheet->getStyle("A1:{$highestColumn}{$highestRow}")->applyFromArray([
                    'font' => ['name' => 'Arial', 'size' => 11],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'E5E7EB'], // Gris très clair
                        ],
                    ],
                ]);

                // Alignement spécifique pour les colonnes numériques et pourcentage
                $sheet->getStyle("C2:F{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("A2:B{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

                // Zébrure des lignes (Alternance de blanc et gris très clair)
                for ($row = 2; $row <= $highestRow; $row++) {
                    if ($row % 2 === 0) {
                        $sheet->getStyle("A{$row}:{$highestColumn}{$row}")->applyFromArray([
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'F9FAFB'], // Gris très doux
                            ]
                        ]);
                    }
                }
            },
        ];
    }
}

// -------------------------------------------------------
// Feuille 2+ : Détail par section
// -------------------------------------------------------
class DetailSectionSheet implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithTitle, WithColumnFormatting, WithEvents
{
    public function __construct(private BudgetSection $budget) {}

    public function title(): string
    {
        $name = str_replace(['\\', '/', '?', '*', ':', '[', ']'], '', $this->budget->section->nom);
        return substr($name, 0, 31); 
    }

    public function collection()
    {
        return $this->budget->transactions()
            ->where('statut_validation', 'VALIDE_N2')
            ->with(['contrat.personne', 'valideN2Par'])
            ->orderBy('date_transaction')
            ->get();
    }

    public function headings(): array
    {
        return [
            'Date',
            'Libellé',
            'Catégorie',
            'Bénéficiaire',
            'Montant (FCFA)',
            'Validé par',
        ];
    }

    public function map($transaction): array
    {
        $dateStr = $transaction->date_transaction instanceof Carbon 
            ? $transaction->date_transaction->format('d/m/Y')
            : Carbon::parse($transaction->date_transaction)->format('d/m/Y');

        return [
            $dateStr,
            $transaction->libelle,
            $transaction->categorie,
            $transaction->contrat?->personne?->nom_complet ?? '-',
            (float) $transaction->montant,
            $transaction->valideN2Par?->name ?? $transaction->valideN2Par?->personne?->nom_complet ?? '-',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'E' => '#,##0',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        // Style de l'en-tête (Rouge SBEE #ED1F24)
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'name' => 'Arial', 'size' => 11],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ED1F24']],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->setShowGridLines(true);

                $highestRow = $sheet->getHighestRow();
                $highestColumn = $sheet->getHighestColumn();
                
                // Application de la police et des bordures
                $sheet->getStyle("A1:{$highestColumn}{$highestRow}")->applyFromArray([
                    'font' => ['name' => 'Arial', 'size' => 11],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'E5E7EB'],
                        ],
                    ],
                ]);

                // Centrer la colonne de date (colonne A) et aligner le montant à droite
                $sheet->getStyle("A2:A{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E2:E{$highestRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

                // Zébrure des lignes
                for ($row = 2; $row <= $highestRow; $row++) {
                    if ($row % 2 === 0) {
                        $sheet->getStyle("A{$row}:{$highestColumn}{$row}")->applyFromArray([
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'F9FAFB'],
                            ]
                        ]);
                    }
                }
            },
        ];
    }
}