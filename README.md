#  SBEE Sports — Application de gestion sportive

##  Présentation

**SBEE Sports** est une application web de gestion sportive conçue pour centraliser les activités administratives, sportives, financières et logistiques d'un club professionnel.

L'application permet de regrouper les informations relatives aux joueurs, au personnel, aux contrats, aux événements sportifs, aux budgets, aux dépenses et aux équipements au sein d'une plateforme unique.

L'objectif est de faciliter le suivi des activités, d'améliorer l'organisation des données et de fournir aux responsables des informations utiles à la prise de décision.

---

##  Problématique

La gestion traditionnelle d'un club sportif peut s'appuyer sur des documents papier et différents fichiers Excel, ce qui peut entraîner :

* une dispersion des informations ;
* des difficultés de suivi des contrats ;
* un manque de visibilité sur les dépenses ;
* des risques de perte ou de duplication des données ;
* des difficultés dans le suivi des équipements ;
* un accès limité aux statistiques et rapports.

Cette application apporte une solution centralisée permettant de mieux organiser et suivre ces différentes activités.

---

##  Fonctionnalités principales

###  Gestion des utilisateurs

* création et gestion des utilisateurs ;
* gestion des rôles ;
* gestion des permissions ;
* contrôle des accès selon le profil utilisateur.

###  Gestion sportive

* gestion des joueurs ;
* gestion du personnel sportif ;
* gestion des équipes et sections ;
* gestion des événements sportifs ;
* suivi des matchs et activités ;
* suivi des présences ;
* suivi des performances.

###  Gestion des contrats

* enregistrement des contrats ;
* suivi des informations contractuelles ;
* gestion des documents associés ;
* consultation des informations relatives aux contrats.

###  Gestion financière

* gestion des budgets ;
* enregistrement des transactions ;
* suivi des dépenses ;
* suivi des ressources financières ;
* statistiques financières.

###  Gestion des équipements

* gestion des équipements sportifs ;
* suivi des stocks ;
* suivi des entrées et sorties ;
* contrôle des ressources disponibles.

###  Tableaux de bord

* indicateurs de suivi ;
* statistiques ;
* synthèse des activités ;
* visualisation des informations importantes.

---

##  Gestion des rôles

L'application repose sur un système d'accès basé sur les rôles.

### Super administrateur

Accès global à l'application :

* utilisateurs et permissions ;
* joueurs et personnel ;
* contrats et documents ;
* budgets et transactions ;
* événements ;
* équipements ;
* rapports et statistiques.

### Trésorier

Gestion principalement orientée vers les activités financières :

* budgets ;
* transactions ;
* dépenses ;
* primes et bonus ;
* statistiques financières.

### Responsable de section

Gestion des activités de sa section :

* joueurs ;
* contrats ;
* événements ;
* entraînements ;
* présences ;
* équipements ;
* ressources ;
* rapports.

### Coach

Gestion des activités sportives :

* événements ;
* entraînements ;
* présences ;
* performances ;
* sanctions.

### Médecin

Gestion des informations médicales et du suivi des consultations des sportifs.

---

##  Architecture

L'application est basée sur une architecture séparant les différentes responsabilités du système.

Le backend assure notamment :

* la logique métier ;
* l'accès aux données ;
* l'authentification ;
* la gestion des utilisateurs ;
* les rôles et permissions ;
* les API.

Le frontend permet aux utilisateurs d'interagir avec les différentes fonctionnalités de l'application.

---

##  Technologies utilisées

### Backend

* PHP
* Laravel

### Frontend

* React
* JavaScript
* HTML5
* Tailwind CSS

### Base de données

* MySQL

### Gestion de versions

* Git
* GitHub

---

##  Sécurité

L'application intègre un système de contrôle d'accès permettant de limiter les fonctionnalités accessibles à chaque utilisateur selon son rôle et ses permissions.

Les données sont organisées dans une base de données centralisée afin de faciliter leur gestion et leur sécurisation.

---

##  Captures d'écran

Les captures d'écran de l'application seront ajoutées dans cette section afin de présenter les principales interfaces :

* tableau de bord ;
* gestion des joueurs ;
* gestion des contrats ;
* gestion des budgets ;
* gestion des événements ;
* gestion des équipements ;
* gestion des utilisateurs.

---

##  Structure du projet

```text
sbee-sport-api/
│
├── app/
├── config/
├── database/
├── public/
├── resources/
├── routes/
├── storage/
├── tests/
├── .env.example
├── composer.json
└── README.md
```

---

##  Installation

### 1. Cloner le repository

```bash
git clone https://github.com/SEMINE2002/sbee-sport-api.git
```

### 2. Accéder au projet

```bash
cd sbee-sport-api
```

### 3. Installer les dépendances PHP

```bash
composer install
```

### 4. Créer le fichier d'environnement

```bash
cp .env.example .env
```

Sous Windows, vous pouvez également créer manuellement le fichier `.env` à partir de `.env.example`.

### 5. Générer la clé Laravel

```bash
php artisan key:generate
```

### 6. Configurer la base de données

Modifier les informations de connexion à la base de données dans le fichier `.env`.

### 7. Exécuter les migrations

```bash
php artisan migrate
```

### 8. Lancer l'application

```bash
php artisan serve
```

---

##  État du projet

Projet développé dans le cadre de ma formation en **Systèmes Informatiques et Génie Logiciel** et de mon expérience au sein de la **Direction des Systèmes d'Information et de la Transformation Digitale (DSI-TD) de la SBEE**.

Le projet constitue également une base de travail pouvant être améliorée avec de nouvelles fonctionnalités et intégrations.

---

##  Auteur

**Sèmine Oyenian**

Développeur Web & Solutions de Gestion

GitHub : https://github.com/SEMINE2002
