#!/bin/sh
set -e

# Đổi port Nginx theo biến môi trường $PORT của Render (Render thường bind port động như 10000)
if [ -n "$PORT" ]; then
    sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/sites-available/default
fi

# Chạy package:discover của Laravel
php /var/www/html/artisan package:discover --ansi || true

# Liên kết storage công khai
php /var/www/html/artisan storage:link || true

# Tối ưu hóa cấu hình Laravel production
php /var/www/html/artisan config:cache || true
php /var/www/html/artisan route:cache || true

for d in Modules/*/; do
    mkdir -p "${d}resources/views"
done
php /var/www/html/artisan view:cache || true

# Tự động chạy migration database
php /var/www/html/artisan migrate --force || true


#if [ "$RUN_SEED" = "true" ]; then
 #   echo ">>> Đang chạy seeder..."
  #  php artisan db:seed --force || echo ">>> SEED FAILED"
#fi


echo ">>> Bắt đầu khởi động Supervisord (Nginx + PHP-FPM + Queue + Scheduler)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
