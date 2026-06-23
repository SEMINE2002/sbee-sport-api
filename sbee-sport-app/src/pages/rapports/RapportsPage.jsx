import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  FileText, Download, Calendar, Users, ShieldCheck,
  Briefcase, ShoppingBag, Award, Wallet, Search,
  Loader2, ArrowRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000';

// Instance Axios authentifiée — même convention que PublicHomePage (clé sbee_token)
const apiAuth = axios.create({ baseURL: `${API_BASE}/api` });
apiAuth.interceptors.request.use(config => {
  const token = localStorage.getItem('sbee_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ──────────────────────────────────────────────────────────────────────────
// Domaines — chaque domaine est rattaché à une classe .badge-* existante
// (badge-red / badge-blue / badge-yellow / badge-green)
// ──────────────────────────────────────────────────────────────────────────
const DOMAINS = {
  finances: {
    label: 'Trésorerie & Budgets',
    icon: Wallet,
    badge: 'badge-red',
  },
  rh: {
    label: 'Ressources humaines & effectifs',
    icon: Users,
    badge: 'badge-blue',
  },
  logistique: {
    label: 'Logistique & équipements',
    icon: ShoppingBag,
    badge: 'badge-yellow',
  },
  activites: {
    label: 'Activités & événements',
    icon: Calendar,
    badge: 'badge-green',
  },
};

const FORMAT_BTN = {
  PDF:   'btn-outline',
  EXCEL: 'btn-secondary',
};

// ──────────────────────────────────────────────────────────────────────────
// Rapports — chaque action porte sa route Laravel réelle + le nom de
// fichier suggéré pour le téléchargement (extension ajoutée automatiquement)
// ──────────────────────────────────────────────────────────────────────────
const REPORTS = [
  {
    domain: 'finances',
    icon: Wallet,
    title: 'Bilan financier global',
    description: 'Budgets alloués, consommés et restants, ventilés par section analytique.',
    actions: [
      { key: 'bilan-financier-pdf', label: 'PDF', format: 'PDF', endpoint: '/rapports/export-pdf', filename: 'bilan-financier.pdf' },
      { key: 'bilan-financier-excel', label: 'Excel', format: 'EXCEL', endpoint: '/rapports/export-excel', filename: 'bilan-financier.xlsx' },
    ],
  },
  {
    domain: 'finances',
    icon: FileText,
    title: 'État de paie',
    description: 'Récapitulatif des émoluments et des primes versées au personnel.',
    actions: [
      {
        key: 'etat-paie', label: 'Excel', format: 'EXCEL',
        endpoint: '/rapports/etat-paie-excel', filename: 'etat-paie.xlsx',
        // L'état de paie exige mois/année — on transmet le mois courant par défaut
        params: { mois: new Date().getMonth() + 1, annee: new Date().getFullYear() },
      },
    ],
  },
  {
    domain: 'rh',
    icon: Users,
    title: 'Membres par discipline / section',
    description: 'Effectifs des athlètes, coachs et officiels, par discipline et section.',
    actions: [
      { key: 'effectifs-pdf', label: 'PDF', format: 'PDF', endpoint: '/rapports/effectifs-pdf', filename: 'effectifs.pdf' },
      { key: 'effectifs-excel', label: 'Excel', format: 'EXCEL', endpoint: '/rapports/effectifs-excel', filename: 'effectifs.xlsx' },
    ],
  },
  {
    domain: 'rh',
    icon: Briefcase,
    title: 'Registre des contrats',
    description: 'Contrats en cours, à renouveler ou expirés, pour le suivi administratif.',
    actions: [
      { key: 'contrats-pdf', label: 'PDF', format: 'PDF', endpoint: '/rapports/contrats-pdf', filename: 'contrats.pdf' },
      { key: 'contrats-excel', label: 'Excel', format: 'EXCEL', endpoint: '/rapports/contrats-excel', filename: 'contrats.xlsx' },
    ],
  },
  {
    domain: 'logistique',
    icon: ShoppingBag,
    title: 'Inventaire du matériel',
    description: 'État des stocks et consommables disponibles par section analytique.',
    actions: [
      { key: 'inventaire-pdf', label: 'PDF', format: 'PDF', endpoint: '/rapports/inventaire-pdf', filename: 'inventaire.pdf' },
      { key: 'inventaire-excel', label: 'Excel', format: 'EXCEL', endpoint: '/rapports/inventaire-excel', filename: 'inventaire.xlsx' },
    ],
  },
  {
    domain: 'logistique',
    icon: Award,
    title: 'Suivi des dotations',
    description: 'Équipements prêtés, en retard de restitution ou déclarés perdus.',
    actions: [
      { key: 'dotations-pdf', label: 'PDF', format: 'PDF', endpoint: '/rapports/dotations-pdf', filename: 'dotations.pdf' },
      { key: 'dotations-excel', label: 'Excel', format: 'EXCEL', endpoint: '/rapports/dotations-excel', filename: 'dotations.xlsx' },
    ],
  },
  {
    domain: 'activites',
    icon: Calendar,
    title: 'Bilan des événements',
    description: 'Matchs, entraînements et réunions par section, sur une période donnée.',
    actions: [
      { key: 'evenements-pdf', label: 'PDF', format: 'PDF', endpoint: '/rapports/evenements-pdf', filename: 'evenements.pdf' },
      { key: 'evenements-excel', label: 'Excel', format: 'EXCEL', endpoint: '/rapports/evenements-excel', filename: 'evenements.xlsx' },
    ],
  },
];

export default function RapportsPage() {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  const handleDownload = async (action) => {
    setPending(action.key);
    setError('');
    try {
      const { data } = await apiAuth.get(action.endpoint, {
        params: action.params ?? {},
        responseType: 'blob',
      });

      // Déclenche le téléchargement du fichier binaire reçu
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', action.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message
        ?? 'Erreur lors de la génération du rapport. Vérifiez vos droits d\'accès.'
      );
    } finally {
      setPending(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REPORTS;
    return REPORTS.filter(r =>
      r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const report of filtered) {
      (groups[report.domain] ??= []).push(report);
    }
    return groups;
  }, [filtered]);

  const totalActions = REPORTS.reduce((sum, r) => sum + r.actions.length, 0);

  return (
    <div className="page-content fade-in">

      {/* ── En-tête de page ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports &amp; extractions</h1>
          <p className="page-subtitle">
            Centralisez l'extraction des données du club : effectifs, finances, contrats,
            matériel et activités sportives.
          </p>
        </div>
        <span className="badge badge-green">
          <ShieldCheck size={12} />
          Accès restreint
        </span>
      </div>

      {error && (
        <div className="alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* ── Bande de repères ── */}
      <div className="stats-grid">
        {[
          { label: 'Catégories', value: Object.keys(DOMAINS).length },
          { label: 'Rapports disponibles', value: REPORTS.length },
          { label: "Formats d'export", value: totalActions },
          { label: 'Mise à jour', value: 'En direct' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <p style={{ fontFamily: 'var(--font-title)', fontSize: 24, fontWeight: 600, margin: 0 }}>
              {stat.value}
            </p>
            <p className="page-subtitle" style={{ marginTop: 2 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Recherche ── */}
      <div className="input-icon-wrap" style={{ marginBottom: 24 }}>
        <Search size={15} className="input-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un rapport (ex: contrats, inventaire, paie...)"
          className="input"
        />
      </div>

      {/* ── Panneaux par domaine ── */}
      <div className="col">
        {Object.entries(DOMAINS).map(([key, domain]) => {
          const reports = grouped[key];
          if (!reports || reports.length === 0) return null;
          const DomainIcon = domain.icon;

          return (
            <div key={key} className="card">
              <div className="row" style={{ marginBottom: 16 }}>
                <span className={`badge ${domain.badge}`}>
                  <DomainIcon size={12} />
                  {domain.label}
                </span>
                <span className="page-subtitle ml-auto">
                  {reports.length} rapport{reports.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Rapport</th>
                      <th>Téléchargement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => {
                      const ReportIcon = report.icon;
                      return (
                        <tr key={report.title}>
                          <td>
                            <div className="row">
                              <span
                                style={{
                                  width: 36, height: 36, borderRadius: 8,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, background: 'var(--red-light)', color: 'var(--red)',
                                }}
                              >
                                <ReportIcon size={16} />
                              </span>
                              <div>
                                <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{report.title}</p>
                                <p className="page-subtitle" style={{ marginTop: 1 }}>{report.description}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="row-sm">
                              {report.actions.map((action) => {
                                const isLoading = pending === action.key;
                                return (
                                  <button
                                    key={action.key}
                                    onClick={() => handleDownload(action)}
                                    disabled={isLoading}
                                    className={`btn btn-sm ${FORMAT_BTN[action.format]}`}
                                  >
                                    {isLoading ? (
                                      <Loader2 size={13} className="spin" />
                                    ) : (
                                      <Download size={13} />
                                    )}
                                    {action.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>
              Aucun rapport ne correspond à « {query} »
            </p>
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              Essayez un autre mot-clé : finances, effectifs, matériel, événements…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}