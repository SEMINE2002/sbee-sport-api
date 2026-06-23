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
        .badge-actif { background: #f0fdf4; color: #16a34a; }
        .badge-expire { background: #fef2f2; color: #dc2626; }
        .badge-autre { background: #f9fafb; color: #6b7280; }
    </style>
</head>
<body>
    <h1>Registre des contrats</h1>
    <p class="subtitle">Généré le {{ $date }}</p>

    <table>
        <thead>
            <tr>
                <th>Nom complet</th>
                <th>Discipline</th>
                <th>Section</th>
                <th>Saison</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Salaire fixe</th>
                <th>Date début</th>
                <th>Date fin</th>
            </tr>
        </thead>
        <tbody>
            @foreach($contrats as $contrat)
            <tr>
                <td>{{ $contrat->personne?->nom_complet ?? '-' }}</td>
                <td>{{ $contrat->section?->discipline?->nom ?? '-' }}</td>
                <td>{{ $contrat->section?->nom ?? '-' }}</td>
                <td>{{ $contrat->saison?->nom ?? '-' }}</td>
                <td>{{ $contrat->type_role }}</td>
                <td>
                    <span class="badge {{ $contrat->statut === 'ACTIF' ? 'badge-actif' : ($contrat->statut === 'EXPIRE' ? 'badge-expire' : 'badge-autre') }}">
                        {{ $contrat->statut }}
                    </span>
                </td>
                <td>{{ number_format((float) $contrat->salaire_fixe, 0, ',', ' ') }} FCFA</td>
                <td>{{ optional($contrat->date_debut_contrat)->format('d/m/Y') ?? '-' }}</td>
                <td>{{ optional($contrat->date_fin_contrat)->format('d/m/Y') ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <p class="footer">Total : {{ $contrats->count() }} contrat(s) — SBEE Sport</p>
</body>
</html>