#!/usr/bin/env bash
set -euo pipefail   # abort on any error, propagate errors through pipelines

# -------------------------------------------------
# OPTIONAL: Laravel preparation steps (uncomment if needed)
# -------------------------------------------------
# php /var/www/html/artisan migrate --force
# php /var/www/html/artisan config:cache
# php /var/www/html/artisan route:cache
# php /var/www/html/artisan view:cache

# -------------------------------------------------
# Launch Supervisor (foreground) – this becomes PID 1
# -------------------------------------------------
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/sbee.conf
