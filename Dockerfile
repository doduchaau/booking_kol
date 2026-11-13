# ==========================================
# Giai đoạn 1: Build Frontend (Node.js & Vite)
# ==========================================
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ==========================================
# Giai đoạn 2: Runtime (PHP 8.2-FPM + Nginx + Supervisor)
# ==========================================
FROM php:8.2-fpm-bookworm

# Cài đặt tiện ích cài extension PHP chuẩn Docker (tự giải quyết mọi C library dependencies)
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

# Cài đặt Nginx, Supervisor, Git, Unzip và các extension PHP bắt buộc
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    git \
    unzip \
    ca-certificates \
    && install-php-extensions \
        pdo_mysql \
        bcmath \
        zip \
        gd \
        intl \
        opcache \
        redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Cài đặt Composer chính thức
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Sao chép toàn bộ mã nguồn
COPY . .

# Sao chép assets đã build từ Stage 1
COPY --from=frontend /app/public/build ./public/build

# Cài đặt PHP dependencies (bỏ qua scripts lúc build để tránh lỗi thiếu database/env)
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Phân quyền thư mục lưu trữ cho www-data
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Cấu hình Nginx & Supervisor
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
