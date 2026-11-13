#!/bin/sh
set -e

# Đổi port Nginx theo biến môi trường $PORT của Render (nếu có)
if [ -n "$PORT" ]; then
    sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/sites-available/default
fi

# Liên kết storage công khai
php /var/www/html/artisan storage:link || true

# Tối ưu hóa cấu hình Laravel production
php /var/www/html/artisan config:cache || true
php /var/www/html/artisan route:cache || true
php /var/www/html/artisan view:cache || true

# Tự động chạy migration database
php /var/www/html/artisan migrate --force || true

echo ">>> Bắt đầu khởi động Supervisord (Nginx + PHP-FPM + Queue + Scheduler)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
