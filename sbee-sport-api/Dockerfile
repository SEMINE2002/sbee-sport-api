FROM php:8.2-apache

# Installation des dépendances systèmes nécessaires
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    zip \
    unzip \
    git

# Installation et activation des extensions PHP requises
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd pdo pdo_mysql zip

# Copie des fichiers du projet
COPY . /var/www/html

# Configuration d'Apache pour pointer sur le dossier public (Laravel)
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Installation des dépendances (sans --no-dev pour inclure les packages requis comme Telescope)
RUN composer install --optimize-autoloader --ignore-platform-req=ext-zip

# Attribution des permissions correctes pour Laravel
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache