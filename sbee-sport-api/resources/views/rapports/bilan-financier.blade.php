<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1a1a1a; }

        /* En-tête */
        .header { background-color: #ed1f24; color: white; padding: 16px 20px; margin-bottom: 20px; }
        .header h1 { font-size: 18px; font-weight: bold; }
        .header p { font-size: 11px; opacity: 0.85; margin-top: 4px; }

        /* Résumé global */
        .summary { display: flex; gap: 12px; margin-bottom: 20px; }
        .summary-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; }
        .summary-card .label { font-size: 10px; color: #64748b; margin-bottom: 4px; }
        .summary-card .value { font-size: 14px; font-weight: bold; color: #1e293b; }

        /* Tableau principal */
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead tr { background-color: #ed1f24; color: white; }
        thead th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; }
        tbody tr:nth-child(even) { background-color: #f8f6f6; }
        tbody tr:hover { background-color: #fee2e2; }
        tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }

        /* Barre de progression */
        .progress-bar { background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; background: #ed1f24; }
        .progress-fill.ok { background: #22c55e; }
        .progress-fill.warn { background: #f59e0b; }

        /* Footer */
        .footer { text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 20px; }
    </style>
</head>
<body>

    <div class="header">
        <h1>📊 Bilan Financier — {{ $saison->nom }}</h1>
        <p>Plateforme SBEE Sport · Généré le {{ $date }}</p>
    </div>

    {{-- Résumé global --}}
    <div class="summary">
        <div class="summary-card">
            <div class="label">Budget Total Alloué</div>
            <div class="value">{{ number_format($totaux['alloue'], 0, ',', '.') }} FCFA</div>
        </div>
        <div class="summary-card">
            <div class="label">Total Dépensé</div>
            <div class="value" style="color:#ed1f24">{{ number_format($totaux['depense'], 0, ',', '.') }} FCFA</div>
        </div>
        <div class="summary-card">
            <div class="label">Reste en Caisse</div>
            <div class="value" style="color:#22c55e">{{ number_format($totaux['restant'], 0, ',', '.') }} FCFA</div>
        </div>
        <div class="summary-card">
            <div class="label">% Consommé</div>
            <div class="value">
                @if($totaux['alloue'] > 0)
                    {{ round(($totaux['depense'] / $totaux['alloue']) * 100, 1) }}%
                @else
                    0%
                @endif
            </div>
        </div>
    </div>

    {{-- Tableau par section --}}
    <table>
        <thead>
            <tr>
                <th>Section</th>
                <th>Discipline</th>
                <th>Budget Alloué</th>
                <th>Dépensé</th>
                <th>Restant</th>
                <th>Consommation</th>
            </tr>
        </thead>
        <tbody>
            @foreach($budgets as $budget)
            @php
                $pct = $budget->montant_alloue > 0
                    ? round(($budget->montant_depense / $budget->montant_alloue) * 100, 1)
                    : 0;
                $couleur = $pct >= 90 ? '' : ($pct >= 70 ? 'warn' : 'ok');
            @endphp
            <tr>
                <td><strong>{{ $budget->section->nom }}</strong></td>
                <td>{{ $budget->section->discipline->nom }}</td>
                <td>{{ number_format($budget->montant_alloue, 0, ',', '.') }} F</td>
                <td>{{ number_format($budget->montant_depense, 0, ',', '.') }} F</td>
                <td>{{ number_format($budget->montant_restant, 0, ',', '.') }} F</td>
                <td>
                    <div class="progress-bar" style="width:80px;display:inline-block;vertical-align:middle">
                        <div class="progress-fill {{ $couleur }}" style="width:{{ min($pct, 100) }}%"></div>
                    </div>
                    <span style="margin-left:4px">{{ $pct }}%</span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        SBEE Sport Platform · Document confidentiel · {{ $date }}
    </div>

</body>
</html>
