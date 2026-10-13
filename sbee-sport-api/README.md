# SBEE Sports — API de gestion sportive

API backend développée avec Laravel pour une application web de gestion sportive. Elle a pour objectif de centraliser les informations administratives, sportives et financières d'un club.

## Présentation du projet

SBEE Sports est un projet de digitalisation de la gestion d'un club sportif professionnel. Il vise à faciliter l'organisation des informations et le suivi des activités grâce à une application web centralisée.

Le backend fournit la logique métier, l'accès aux données et les services nécessaires au fonctionnement du frontend.

## Fonctionnalités

Les fonctionnalités ci-dessous décrivent les domaines couverts par le projet. Leur disponibilité effective dépend de l'implémentation dans le code.

- **Utilisateurs et permissions :** gestion des accès selon les rôles.
- **Gestion sportive :** joueurs, personnel, sections et événements.
- **Gestion des contrats :** informations contractuelles et documents associés.
- **Gestion financière :** budgets, dépenses et transactions.
- **Gestion des équipements :** inventaire et suivi des ressources.
- **Rapports et statistiques :** données utiles au suivi des activités.

## Technologies

- **Backend :** PHP et Laravel
- **Base de données de production :** PostgreSQL, selon la configuration de déploiement
- **Base de données :** migrations et seeders Laravel
- **API :** routes et contrôleurs Laravel
- **Gestion de versions :** Git et GitHub

## Architecture du projet

Le backend suit l'organisation conventionnelle d'une application Laravel.

- `app/` : logique applicative, modèles et contrôleurs.
- `bootstrap/` : initialisation de l'application.
- `config/` : configuration.
- `database/` : migrations, factories et seeders.
- `public/` : point d'entrée HTTP et ressources publiques.
- `routes/` : définition des routes.
- `storage/` : journaux et fichiers générés.
- `tests/` : tests automatisés.
- `.env.example` : modèle de configuration locale.

## Prérequis

Avant l'installation, assurez-vous de disposer de :

- PHP dans une version compatible avec le projet ;
- Composer ;
- PostgreSQL ou un autre moteur compatible avec la configuration ;
- Node.js et npm si des ressources frontend doivent être compilées.

Consultez `composer.json` pour connaître la version de PHP requise et les dépendances exactes.

## Installation en local

### 1. Cloner le repository

```bash
git clone https://github.com/SEMINE2002/sbee-sport-api.git
cd sbee-sport-api/sbee-sport-api
```

### 2. Installer les dépendances

```bash
composer install
```

### 3. Configurer l'environnement

Sous macOS ou Linux :

```bash
cp .env.example .env
```

Sous Windows, copiez `.env.example` dans un nouveau fichier nommé `.env`.

Configurez ensuite les paramètres de l'application et de la base de données dans `.env`.

### 4. Générer la clé de l'application

```bash
php artisan key:generate
```

### 5. Préparer la base de données

Après avoir configuré la connexion :

```bash
php artisan migrate
```

N'exécutez les seeders que si vous avez vérifié leur contenu et compris les données qu'ils insèrent.

### 6. Démarrer le serveur

```bash
php artisan serve
```

Par défaut, le serveur de développement Laravel est accessible à l'adresse `http://127.0.0.1:8000`.

## Configuration de production

En production, les variables d'environnement doivent être configurées dans l'environnement sécurisé de l'hébergeur.

Ne publiez jamais de mots de passe, de clés privées, de tokens ou de fichiers `.env` contenant des secrets.

## Sécurité

Le contrôle d'accès, la validation des données, la gestion des erreurs et la protection des informations confidentielles doivent être vérifiés avant toute mise en production.

## État du projet

Projet de développement web réalisé dans le cadre de mon parcours en Systèmes Informatiques et Génie Logiciel.

## Auteur

**Sèmine Oyenian**

Développeur web — Laravel, React et bases de données.

GitHub : https://github.com/SEMINE2002
