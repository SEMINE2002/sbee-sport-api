# ════════════════════════════════════════════════════════════
# Dockerfile — SBEE Sport API (Laravel 11)
# PHP 8.3 + MySQL + PostgreSQL + Redis + Queue
# ════════════════════════════════════════════════════════════

FROM php:8.3-fpm

# ── Arguments de build ──
ARG APP_ENV=production
ARG APP_DEBUG=false

# ── Variables d'environnement ──
ENV APP_ENV=${APP_ENV} \
    APP_DEBUG=${APP_DEBUG} \
    DEBIAN_FRONTEND=noninteractive

# ════════════════════════════════════════════════════════════
# 1. Dépendances système
# ════════════════════════════════════════════════════════════
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Utilitaires système
    curl \
    wget \
    unzip \
    git \
    nano \
    cron \
    supervisor \
    # Librairies pour extensions PHP
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libzip-dev \
    libxml2-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    # ✅ Librairies PostgreSQL (nécessaires pour pdo_pgsql)
    libpq-dev \
    postgresql-client \
    # Librairies MySQL
    default-mysql-client \
    # Librairies pour images
    libwebp-dev \
    libxpm-dev \
    # Librairies Redis
    libmemcached-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ════════════════════════════════════════════════════════════
# 2. Extensions PHP
# ════════════════════════════════════════════════════════════
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        # Bases de données
        pdo \
        pdo_mysql \
        pdo_pgsql \
        pgsql \
        mysqli \
        # Traitement de fichiers
        gd \
        zip \
        exif \
        # Performance
        opcache \
        # Utilitaires
        bcmath \
        mbstring \
        xml \
        curl \
        intl \
        pcntl \
        sockets

# ── Extension Redis via PECL ──
RUN pecl install redis \
    && docker-php-ext-enable redis

# ════════════════════════════════════════════════════════════
# 3. Configuration PHP optimisée pour Laravel
# ════════════════════════════════════════════════════════════
RUN echo "upload_max_filesize = 50M"       >> /usr/local/etc/php/conf.d/laravel.ini \
    && echo "post_max_size = 50M"          >> /usr/local/etc/php/conf.d/laravel.ini \
    && echo "max_execution_time = 120"     >> /usr/local/etc/php/conf.d/laravel.ini \
    && echo "memory_limit = 256M"          >> /usr/local/etc/php/conf.d/laravel.ini \
    && echo "max_input_vars = 3000"        >> /usr/local/etc/php/conf.d/laravel.ini \
    && echo "date.timezone = Africa/Porto-Novo" >> /usr/local/etc/php/conf.d/laravel.ini

# OPCache pour la production
RUN echo "opcache.enable=1"                >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.revalidate_freq=0"    >> /usr/local/etc/php/conf.d/opcache.ini

# ════════════════════════════════════════════════════════════
# 4. Composer
# ════════════════════════════════════════════════════════════
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# ════════════════════════════════════════════════════════════
# 5. Répertoire de travail
# ════════════════════════════════════════════════════════════
WORKDIR /var/www/html

# ════════════════════════════════════════════════════════════
# 6. Copie du code source
# ════════════════════════════════════════════════════════════
# Copie les fichiers composer en premier pour profiter du cache Docker
COPY composer.json composer.lock ./

# Installation des dépendances PHP (sans dev en production)
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader \
    --no-progress

# Copie du reste du code
COPY . .

# ════════════════════════════════════════════════════════════
# 7. Permissions fichiers
# ════════════════════════════════════════════════════════════
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache \
    && mkdir -p /var/www/html/storage/app/public \
    && mkdir -p /var/www/html/storage/logs \
    && mkdir -p /var/www/html/storage/framework/cache \
    && mkdir -p /var/www/html/storage/framework/sessions \
    && mkdir -p /var/www/html/storage/framework/views

# ════════════════════════════════════════════════════════════
# 8. Script de démarrage
# ════════════════════════════════════════════════════════════
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# ════════════════════════════════════════════════════════════
# 9. Configuration Supervisor (queue workers)
# ════════════════════════════════════════════════════════════
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ════════════════════════════════════════════════════════════
# 10. Exposition du port
# ════════════════════════════════════════════════════════════
EXPOSE 9000

# ════════════════════════════════════════════════════════════
# 11. Healthcheck
# ════════════════════════════════════════════════════════════
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD php-fpm -t || exit 1

# ════════════════════════════════════════════════════════════
# 12. Point d'entrée
# ════════════════════════════════════════════════════════════
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]