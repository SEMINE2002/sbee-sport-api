#!/usr/bin/env bash
set -euo pipefail   # abort on any error, propagate errors through pipelines

cd /var/www/html

# -------------------------------------------------
# Port dynamique de Render (défaut local : 10000)
# -------------------------------------------------
: "${PORT:=10000}"
echo ">> Nginx écoutera sur le port ${PORT}"

# -------------------------------------------------
# Génération de la conf Nginx avec le $PORT injecté
# -------------------------------------------------
cat > /etc/nginx/sites-available/laravel <<NGINX
server {
    listen ${PORT};
    server_name _;
    root /var/www/html/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php\$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_param PATH_INFO \$fastcgi_path_info;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
NGINX

# -------------------------------------------------
# Préparation Laravel (production)
# -------------------------------------------------
php artisan storage:link || true

# Migrations (idempotent, bloque le boot si la DB est injoignable)
php artisan migrate --force

# Cache config / routes / vues
php artisan config:cache
php artisan route:cache || true
php artisan view:cache

# -------------------------------------------------
# Démarrage des process : php-fpm en arrière-plan,
# nginx au premier plan (devient PID 1)
# -------------------------------------------------
php-fpm -D                       # démarre php-fpm (daemon) sur 127.0.0.1:9000
exec nginx -g 'daemon off;'      # nginx au premier plan = process principal
