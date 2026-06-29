#!/usr/bin/env bash
set -euo pipefail   # arrêt immédiat en cas d’erreur, propagation des erreurs dans les pipes

# -------------------------------------------------
# 1️⃣  Préparations Laravel (facultatives mais recommandées)
# -------------------------------------------------
# Vous pouvez décommenter les lignes suivantes si vous voulez que
# les migrations, le cache de config, etc. soient exécutés à chaque démarrage.
# php /var/www/html/artisan migrate --force
# php /var/www/html/artisan config:cache
# php /var/www/html/artisan route:cache
# php /var/www/html/artisan view:cache

# -------------------------------------------------
# 2️⃣  Lancer Supervisor (qui gère php-fpm + le worker)
# -------------------------------------------------
# `exec` remplace le shell actuel par supervisord → PID 1 du container,
# ce qui permet une bonne gestion des signaux (SIGTERM, SIGINT) lors de `docker stop`.
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/sbee.conf
