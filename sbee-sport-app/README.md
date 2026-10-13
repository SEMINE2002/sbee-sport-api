# SBEE Sports — Frontend

## Présentation

**SBEE Sports** est une interface web développée avec React pour une application de gestion sportive. Elle permet aux utilisateurs d'interagir avec les fonctionnalités de gestion du club à travers une interface centralisée.

Le frontend communique avec une API Laravel pour accéder aux données et exécuter les opérations autorisées selon les fonctionnalités disponibles dans le backend.

## Fonctionnalités

L'interface est destinée à couvrir les domaines suivants, selon les modules effectivement implémentés :

- Tableau de bord et consultation des indicateurs
- Gestion des joueurs et du personnel
- Gestion des contrats et documents
- Gestion des événements sportifs
- Consultation et suivi des budgets et dépenses
- Gestion des équipements
- Accès aux fonctionnalités selon les rôles et permissions

## Technologies utilisées

- **React** — création de l'interface utilisateur
- **JavaScript** — logique du frontend
- **Vite** — serveur de développement et outil de compilation
- **HTML5 et CSS** — structure et présentation
- **ESLint** — analyse statique du code

Ajoutez Tailwind CSS à cette liste uniquement si sa configuration et son utilisation sont bien présentes dans le projet.

## Prérequis

- Node.js
- npm
- Une API Laravel configurée et accessible

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/SEMINE2002/sbee-sport-api.git
cd sbee-sport-api/sbee-sport-app
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'API

Créez un fichier `.env` à partir de `.env.example`, puis configurez l'adresse de l'API Laravel :

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME="SBEE Sport"
```

L'adresse ci-dessus convient uniquement si l'API Laravel est accessible localement à cette adresse. Pour la production, configurez l'URL publique réelle de l'API.

**Important :** les variables préfixées par `VITE_` sont accessibles au code frontend compilé. N'y placez jamais de mots de passe, de clés privées ou de secrets.

### 4. Lancer le serveur de développement

```bash
npm run dev
```

### 5. Compiler pour la production

```bash
npm run build
```

Les commandes disponibles sont définies dans `package.json`.

## Configuration

La variable `VITE_API_URL` définit l'adresse utilisée par le frontend pour communiquer avec le backend.

La variable `VITE_APP_NAME` définit le nom de l'application lorsqu'il est utilisé par l'interface.

## Architecture

Le projet sépare l'interface utilisateur des services backend :

- **Frontend React :** affichage et interactions utilisateur
- **API Laravel :** logique métier et accès aux données
- **Base de données :** stockage des informations gérées par le backend

## Sécurité

Les autorisations doivent être contrôlées côté backend. Masquer une page ou un bouton dans React ne suffit pas à protéger une ressource de l'API.

Ne publiez jamais de fichiers `.env` contenant des secrets ou des informations confidentielles.

## Auteur

**Sèmine Oyenian**

Développeur web — Laravel, React et bases de données.

GitHub : https://github.com/SEMINE2002
