# ═══════════════════════════════════════════════════════════════
# Dockerfile — SBEE Sport API (Laravel 11)
# Optimisé pour Render.com + PostgreSQL SSL
# ═══════════════════════════════════════════════════════════════

FROM php:8.3-fpm

ENV DEBIAN_FRONTEND=noninteractive

# ═══════════════════════════════════════════════════════════════
# 1. Dépendances système
# ═══════════════════════════════════════════════════════════════
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        unzip \
        git \
        supervisor \
        netcat-openbsd \
        ca-certificates \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libwebp-dev \
        libzip-dev \
        libxml2-dev \
        libonig-dev \
        libcurl4-openssl-dev \
        libssl-dev \
        libicu-dev \
        libpq-dev \
        nginx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ═══════════════════════════════════════════════════════════════
# 2. Extensions PHP
# ═══════════════════════════════════════════════════════════════
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
        gd \
        pdo \
        pdo_pgsql \
        pgsql \
        pdo_mysql \
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

# ═══════════════════════════════════════════════════════════════
# 3. Configuration PHP
# ═══════════════════════════════════════════════════════════════
RUN { \
        echo "upload_max_filesize = 50M"; \
        echo "post_max_size = 50M"; \
        echo "max_execution_time = 120"; \
        echo "memory_limit = 256M"; \
        echo "date.timezone = Africa/Porto-Novo"; \
    } > /usr/local/etc/php/conf.d/laravel.ini \
&& { \
        echo "opcache.enable=1"; \
        echo "opcache.memory_consumption=128"; \
        echo "opcache.max_accelerated_files=10000"; \
        echo "opcache.revalidate_freq=0"; \
    } > /usr/local/etc/php/conf.d/opcache.ini

# ═══════════════════════════════════════════════════════════════
# 4. Composer
# ═══════════════════════════════════════════════════════════════
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# ═══════════════════════════════════════════════════════════════
# 5. Code source
# ═══════════════════════════════════════════════════════════════
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

# ═══════════════════════════════════════════════════════════════
# 6. Permissions & répertoires requis (CORRIGÉ)
# ═══════════════════════════════════════════════════════════════
# CRÉATION DES RÉPERTOIRES NÉCESSAIRES AVANT CHOWN POUR ÉVITER LES PROBLÈMES DE PROPRIÉTÉ
RUN mkdir -p \
        storage/app/public \
        storage/logs \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# ═══════════════════════════════════════════════════════════════
# 7. Configuration Supervisor (avec Nginx intégré) - CORRIGÉ
# ═══════════════════════════════════════════════════════════════
RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor && \
    chown -R www-data:www-data /var/log/supervisor && \
    printf '[supervisord]\n\
nodaemon=true\n\
user=www-data\n\
logfile=/var/log/supervisor/supervisord.log\n\
loglevel=info\n\n\
[unix_http_server]\n\
file=/tmp/supervisor.sock\n\
chmod=0700\n\n\
[supervisorctl]\n\
serverurl=unix:///tmp/supervisor.sock\n\n\
[rpcinterface:supervisor]\n\
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface\n\n\
[program:php-fpm]\n\
command=php-fpm -F\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stderr_logfile=/dev/stderr\n\
\n\
[program:laravel-worker]\n\
command=php /var/www/html/artisan queue:work --sleep=3 --tries=3 --max-time=3600\n\
directory=/var/www/html\n\
autostart=true\n\
autorestart=true\n\
numprocs=1\n\
stdout_logfile=/var/www/html/storage/logs/worker.log\n\
stderr_logfile=/var/www/html/storage/logs/worker-error.log\n\
user=www-data\n\n\
[program:nginx]\n\
command=/usr/sbin/nginx -g \"daemon off; pid /tmp/nginx.pid;\"\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stderr_logfile=/dev/stderr\n\
' > /etc/supervisor/conf.d/sbee.conf

# ═══════════════════════════════════════════════════════════════
# 8. Préparation Nginx (la config est générée au runtime par
#    l'entrypoint pour binder le $PORT dynamique de Render)
# ══════════════════════════════════════════════════════════════
RUN rm -f /etc/nginx/sites-enabled/default \
    && ln -sf /etc/nginx/sites-available/laravel /etc/nginx/sites-enabled/laravel \
    && mkdir -p /var/lib/nginx /var/log/nginx /var/run \
    && chown -R www-data:www-data /var/lib/nginx /var/log/nginx

# ═══════════════════════════════════════════════════════════════
# 9. Script d'entrée (Entrypoint)
# ═══════════════════════════════════════════════════════════════
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# ═══════════════════════════════════════════════════════════════
# 10. Port, health-check et démarrage
# ══════════════════════════════════════════════════════════════
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
    CMD curl -sf "http://localhost:${PORT:-10000}/up" || exit 1  # Endpoint santé Laravel

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# (Aucun CMD défini – l'entrée décide ce qui est lancé via Supervisor)
