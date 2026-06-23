<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; font-size: 11px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 2px; color: #ed1f24; }
        .subtitle { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #fef2f2; color: #c41a1e; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; border-bottom: 2px solid #ed1f24; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
        tr:nth-child(even) td { background: #fafafa; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: right; }
        .badge { padding: 2px 6px; border-radius: 8px; font-size: 9px; }
        .badge-retard { background: #fef2f2; color: #dc2626; }
        .badge-ok { background: #f0fdf4; color: #16a34a; }
    </style>
</head>
<body>
    <h1>Suivi des dotations</h1>
    <p class="subtitle">Généré le {{ $date }}</p>

    <table>
        <thead>
            <tr>
                <th>Bénéficiaire</th>
                <th>Section</th>
                <th>Matériel</th>
                <th>Qté</th>
                <th>Date remise</th>
                <th>Retour prévu</th>
                <th>Retour effectif</th>
                <th>Statut</th>
                <th>En retard</th>
            </tr>
        </thead>
        <tbody>
            @foreach($dotations as $dotation)
            <tr>
                <td>{{ $dotation->contrat?->personne?->nom_complet ?? '-' }}</td>
                <td>{{ $dotation->contrat?->section?->nom ?? '-' }}</td>
                <td>{{ $dotation->stockSection?->typeMateriel?->nom ?? '-' }}</td>
                <td>{{ $dotation->quantite }}</td>
                <td>{{ optional($dotation->date_remise)->format('d/m/Y') ?? '-' }}</td>
                <td>{{ optional($dotation->date_retour_prevue)->format('d/m/Y') ?? '-' }}</td>
                <td>{{ optional($dotation->date_retour_effective)->format('d/m/Y') ?? '-' }}</td>
                <td>{{ $dotation->statut }}</td>
                <td>
                    <span class="badge {{ $dotation->estEnRetard() ? 'badge-retard' : 'badge-ok' }}">
                        {{ $dotation->estEnRetard() ? 'Oui' : 'Non' }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p class="footer">Total : {{ $dotations->count() }} dotation(s) — SBEE Sport</p>
</body>
</html>