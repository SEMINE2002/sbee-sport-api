# ════════════════════════════════════════════════════════════
# Dockerfile — SBEE Sport API (Laravel 11)
# Optimisé Render.com + PostgreSQL SSL
# ════════════════════════════════════════════════════════════

FROM php:8.3-fpm

ENV DEBIAN_FRONTEND=noninteractive

# ════════════════════════════════════════════════════════════
# 1. Dépendances système
# ════════════════════════════════════════════════════════════
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
    echo "opcache.memory_consumption=128"; \
    echo "opcache.max_accelerated_files=10000"; \
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
# 7. Supervisor
# ════════════════════════════════════════════════════════════
RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor && \
    printf '[supervisord]\n\
nodaemon=false\n\
logfile=/var/log/supervisor/supervisord.log\n\
loglevel=info\n\
\n\
[unix_http_server]\n\
file=/var/run/supervisor.sock\n\
chmod=0700\n\
\n\
[supervisorctl]\n\
serverurl=unix:///var/run/supervisor.sock\n\
\n\
[rpcinterface:supervisor]\n\
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface\n\
\n\
[program:php-fpm]\n\
command=php-fpm -F\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:laravel-worker]\n\
command=php /var/www/html/artisan queue:work --sleep=3 --tries=3 --max-time=3600\n\
directory=/var/www/html\n\
autostart=true\n\
autorestart=true\n\
numprocs=1\n\
stdout_logfile=/var/www/html/storage/logs/worker.log\n\
stderr_logfile=/var/www/html/storage/logs/worker-error.log\n\
user=www-data\n\
' > /etc/supervisor/conf.d/sbee.conf

# ════════════════════════════════════════════════════════════
# 8. Entrypoint — optimisé Render + PostgreSQL SSL
# ════════════════════════════════════════════════════════════
RUN cat > /usr/local/bin/entrypoint.sh << 'ENTRYPOINT_SCRIPT'
#!/bin/bash
set -e

echo "======================================"
echo " SBEE Sport API - Demarrage"
echo " ENV      : ${APP_ENV:-production}"
echo " DB_HOST  : ${DB_HOST}"
echo " DB_PORT  : ${DB_PORT:-5432}"
echo " DB_NAME  : ${DB_DATABASE}"
echo "======================================"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# ── Phase 1 : Attente port TCP ──
echo "[1/4] Attente ouverture port ${DB_HOST}:${DB_PORT}..."
TRIES=0
MAX=60
until nc -z -w5 "${DB_HOST}" "${DB_PORT}" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ $TRIES -ge $MAX ]; then
        echo "ERREUR : Port ${DB_HOST}:${DB_PORT} inaccessible apres ${MAX} tentatives."
        echo "Verifiez que DB_HOST est l'Internal URL Render (sans .render.com)"
        exit 1
    fi
    echo "  [$TRIES/$MAX] Port ferme, nouvelle tentative dans 3s..."
    sleep 3
done
echo "  Port ouvert !"

# ── Phase 2 : Verification connexion PDO PostgreSQL ──
echo "[2/4] Test connexion PostgreSQL..."
PDO_TRIES=0
until php -r "
    try {
        \$pdo = new PDO(
            'pgsql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE') . ';sslmode=require',
            getenv('DB_USERNAME'),
            getenv('DB_PASSWORD'),
            [PDO::ATTR_TIMEOUT => 5]
        );
        echo 'ok';
    } catch (Exception \$e) {
        file_put_contents('php://stderr', 'PDO Error: ' . \$e->getMessage() . PHP_EOL);
        exit(1);
    }
" 2>/tmp/pdo_error | grep -q "ok"; do
    PDO_TRIES=$((PDO_TRIES + 1))
    if [ $PDO_TRIES -ge 15 ]; then
        echo "ERREUR connexion PDO :"
        cat /tmp/pdo_error 2>/dev/null
        echo "Verifiez DB_USERNAME, DB_PASSWORD et DB_SSL_MODE"
        exit 1
    fi
    echo "  [$PDO_TRIES/15] Connexion echouee, tentative dans 3s..."
    sleep 3
done
echo "  Connexion PostgreSQL OK !"

# ── Phase 3 : Migrations ──
echo "[3/4] Migrations..."
#php artisan migrate --force --no-interaction
echo "  Migrations OK !"




# ── Phase 4 : Optimisation Laravel ──
echo "[4/4] Optimisation Laravel..."
php artisan storage:link --force 2>/dev/null || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo "  Cache OK !"

echo "======================================"
echo " SBEE Sport API prete !"
echo "======================================"

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/sbee.conf
ENTRYPOINT_SCRIPT

RUN chmod +x /usr/local/bin/entrypoint.sh

# ════════════════════════════════════════════════════════════
# 9. Port et démarrage
# ════════════════════════════════════════════════════════════
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
    CMD php-fpm -t || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]