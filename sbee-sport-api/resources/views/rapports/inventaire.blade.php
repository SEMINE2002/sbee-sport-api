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
        .badge-bas { background: #fffbeb; color: #d97706; }
        .badge-normal { background: #f0fdf4; color: #16a34a; }
    </style>
</head>
<body>
    <h1>Inventaire du matériel</h1>
    <p class="subtitle">Généré le {{ $date }}</p>

    <table>
        <thead>
            <tr>
                <th>Discipline</th>
                <th>Section</th>
                <th>Matériel</th>
                <th>Quantité totale</th>
                <th>Disponible</th>
                <th>En dotation</th>
                <th>Seuil d'alerte</th>
                <th>Statut</th>
            </tr>
        </thead>
        <tbody>
            @foreach($stocks as $stock)
            <tr>
                <td>{{ $stock->section?->discipline?->nom ?? '-' }}</td>
                <td>{{ $stock->section?->nom ?? '-' }}</td>
                <td>{{ $stock->typeMateriel?->nom ?? '-' }}</td>
                <td>{{ $stock->quantite_totale }}</td>
                <td>{{ $stock->quantite_disponible }}</td>
                <td>{{ $stock->quantite_en_dotation }}</td>
                <td>{{ $stock->seuil_alerte }}</td>
                <td>
                    <span class="badge {{ $stock->estSousSeuil() ? 'badge-bas' : 'badge-normal' }}">
                        {{ $stock->estSousSeuil() ? 'Stock bas' : 'Normal' }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p class="footer">Total : {{ $stocks->count() }} ligne(s) de stock — SBEE Sport</p>
</body>
</html> 