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
    && docker-php-ext-install gd pdo pdo_mysql pdo_pgsql zip

# Copie des fichiers du projet
COPY . /var/www/html

# Configuration d'Apache pour pointer sur le dossier public (Laravel)
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

# Installation de Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Installation des dépendances
RUN composer install --optimize-autoloader --ignore-platform-req=ext-zip

# Attribution des permissions correctes pour Laravel
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Création d'un script de démarrage pour nettoyer le cache et migrer à chaque lancement
# Remplacez l'ancienne ligne RUN echo par celle-ci :
RUN echo '#!/bin/bash\nexport MYSQL_ATTR_SSL_MODE=0\nphp /var/www/html/artisan config:cache\nphp /var/www/html/artisan migrate --force\napache2-foreground' > /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

# Lancement du script
CMD ["/usr/local/bin/start.sh"]