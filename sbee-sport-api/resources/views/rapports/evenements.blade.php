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
        .badge-victoire { background: #f0fdf4; color: #16a34a; }
        .badge-defaite { background: #fef2f2; color: #dc2626; }
        .badge-nul { background: #fffbeb; color: #d97706; }
        .badge-attente { background: #f9fafb; color: #6b7280; }
    </style>
</head>
<body>
    <h1>Bilan des événements</h1>
    <p class="subtitle">Saison : {{ $saison->nom }} — Généré le {{ $date }}</p>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Discipline</th>
                <th>Section</th>
                <th>Lieu</th>
                <th>Adversaire</th>
                <th>Score</th>
                <th>Résultat</th>
            </tr>
        </thead>
        <tbody>
            @foreach($evenements as $e)
            @php
                $badgeClass = match($e->resultat) {
                    'VICTOIRE' => 'badge-victoire',
                    'DEFAITE'  => 'badge-defaite',
                    'NUL'      => 'badge-nul',
                    default    => 'badge-attente',
                };
            @endphp
            <tr>
                <td>{{ optional($e->date_heure)->format('d/m/Y H:i') ?? '-' }}</td>
                <td>{{ $e->type }}</td>
                <td>{{ $e->section?->discipline?->nom ?? '-' }}</td>
                <td>{{ $e->section?->nom ?? '-' }}</td>
                <td>{{ $e->lieu ?? '-' }} ({{ $e->domicile ? 'Dom.' : 'Ext.' }})</td>
                <td>{{ $e->adversaire ?? '-' }}</td>
                <td>
                    @if($e->score_nous !== null && $e->score_adversaire !== null)
                        {{ $e->score_nous }} - {{ $e->score_adversaire }}
                    @else
                        -
                    @endif
                </td>
                <td><span class="badge {{ $badgeClass }}">{{ $e->resultat ?? 'EN_ATTENTE' }}</span></td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p class="footer">Total : {{ $evenements->count() }} événement(s) — SBEE Sport</p>
</body>
</html>