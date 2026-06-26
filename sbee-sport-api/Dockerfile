# ════════════════════════════════════════════════════════════
# Dockerfile — SBEE Sport API (Laravel 11)
# Corrigé : libicu-dev ajouté pour l'extension intl
# ════════════════════════════════════════════════════════════

FROM php:8.3-fpm

ENV DEBIAN_FRONTEND=noninteractive

# ════════════════════════════════════════════════════════════
# 1. Dépendances système
# ════════════════════════════════════════════════════════════
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    unzip \
    git \
    supervisor \
    nano \
    # Images GD
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libwebp-dev \
    # Zip
    libzip-dev \
    # XML / MBString
    libxml2-dev \
    libonig-dev \
    # SSL / Curl
    libcurl4-openssl-dev \
    libssl-dev \
    # ✅ ICU pour l'extension intl
    libicu-dev \
    # ✅ PostgreSQL pour pdo_pgsql
    libpq-dev \
    postgresql-client \
    # MySQL
    default-mysql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ════════════════════════════════════════════════════════════
# 2. Extensions PHP
# ════════════════════════════════════════════════════════════
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
        gd \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        pgsql \
        mysqli \
        zip \
        bcmath \
        mbstring \
        xml \
        curl \
        intl \
        pcntl \
        sockets \
        opcache \
        exif

# ── Redis via PECL ──
RUN pecl install redis \
    && docker-php-ext-enable redis

# ════════════════════════════════════════════════════════════
# 3. Configuration PHP
# ════════════════════════════════════════════════════════════
RUN { \
    echo "upload_max_filesize = 50M"; \
    echo "post_max_size = 50M"; \
    echo "max_execution_time = 120"; \
    echo "memory_limit = 256M"; \
    echo "date.timezone = Africa/Porto-Novo"; \
} > /usr/local/etc/php/conf.d/laravel.ini \
&& { \
    echo "opcache.enable=1"; \
    echo "opcache.memory_consumption=256"; \
    echo "opcache.max_accelerated_files=20000"; \
    echo "opcache.revalidate_freq=0"; \
} > /usr/local/etc/php/conf.d/opcache.ini

# ════════════════════════════════════════════════════════════
# 4. Composer
# ════════════════════════════════════════════════════════════
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# ════════════════════════════════════════════════════════════
# 5. Code source
# ════════════════════════════════════════════════════════════
WORKDIR /var/www/html

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader \
    --no-progress

COPY . .

# ════════════════════════════════════════════════════════════
# 6. Permissions
# ════════════════════════════════════════════════════════════
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache \
    && mkdir -p storage/app/public \
               storage/logs \
               storage/framework/cache \
               storage/framework/sessions \
               storage/framework/views

# ════════════════════════════════════════════════════════════
# 7. Supervisor — inline
# ════════════════════════════════════════════════════════════
RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor

RUN { \
    echo "[supervisord]"; \
    echo "nodaemon=false"; \
    echo "logfile=/var/log/supervisor/supervisord.log"; \
    echo "loglevel=info"; \
    echo ""; \
    echo "[unix_http_server]"; \
    echo "file=/var/run/supervisor.sock"; \
    echo "chmod=0700"; \
    echo ""; \
    echo "[supervisorctl]"; \
    echo "serverurl=unix:///var/run/supervisor.sock"; \
    echo ""; \
    echo "[rpcinterface:supervisor]"; \
    echo "supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface"; \
    echo ""; \
    echo "[program:php-fpm]"; \
    echo "command=php-fpm -F"; \
    echo "autostart=true"; \
    echo "autorestart=true"; \
    echo "stdout_logfile=/dev/stdout"; \
    echo "stdout_logfile_maxbytes=0"; \
    echo "stderr_logfile=/dev/stderr"; \
    echo "stderr_logfile_maxbytes=0"; \
    echo ""; \
    echo "[program:laravel-worker]"; \
    echo "command=php /var/www/html/artisan queue:work --sleep=3 --tries=3 --max-time=3600"; \
    echo "directory=/var/www/html"; \
    echo "autostart=true"; \
    echo "autorestart=true"; \
    echo "numprocs=2"; \
    echo "stdout_logfile=/var/www/html/storage/logs/worker.log"; \
    echo "stderr_logfile=/var/www/html/storage/logs/worker-error.log"; \
    echo "user=www-data"; \
    echo ""; \
    echo "[program:laravel-scheduler]"; \
    echo "command=bash -c 'while true; do php /var/www/html/artisan schedule:run --no-interaction >> /var/www/html/storage/logs/scheduler.log 2>&1; sleep 60; done'"; \
    echo "directory=/var/www/html"; \
    echo "autostart=true"; \
    echo "autorestart=true"; \
    echo "numprocs=1"; \
    echo "stdout_logfile=/var/www/html/storage/logs/scheduler.log"; \
    echo "user=www-data"; \
} > /etc/supervisor/conf.d/sbee.conf

# ════════════════════════════════════════════════════════════
# 8. Entrypoint — inline
# ════════════════════════════════════════════════════════════
RUN printf '#!/bin/bash\n\
set -e\n\
echo "Demarrage SBEE Sport API..."\n\
\n\
# Attente DB\n\
echo "Attente de la base de donnees..."\n\
TRIES=0\n\
until php artisan migrate:status > /dev/null 2>&1; do\n\
  TRIES=$((TRIES+1))\n\
  [ $TRIES -ge 30 ] && echo "DB inaccessible apres 30 tentatives" && exit 1\n\
  echo "  Tentative $TRIES/30 - attente 3s..."\n\
  sleep 3\n\
done\n\
echo "Base de donnees connectee"\n\
\n\
# Migrations\n\
php artisan migrate --force --no-interaction\n\
echo "Migrations terminees"\n\
\n\
# Seeder si base vide\n\
USER_COUNT=$(php artisan tinker --execute="echo \\App\\Models\\User::count();" 2>/dev/null | grep -E "^[0-9]+$" | tail -1)\n\
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then\n\
  echo "Initialisation des donnees..."\n\
  php artisan db:seed --force --no-interaction 2>/dev/null || true\n\
fi\n\
\n\
# Storage link\n\
php artisan storage:link --force 2>/dev/null || true\n\
\n\
# Cache\n\
php artisan config:cache\n\
php artisan route:cache\n\
php artisan view:cache\n\
\n\
echo "API prete ! Lancement Supervisor..."\n\
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/sbee.conf\n\
' > /usr/local/bin/entrypoint.sh \
&& chmod +x /usr/local/bin/entrypoint.sh

# ════════════════════════════════════════════════════════════
# 9. Exposition et démarrage
# ════════════════════════════════════════════════════════════
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD php-fpm -t || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]