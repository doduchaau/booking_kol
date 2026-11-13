# ==========================================
# Giai đoạn 1: Build Frontend (Node.js & Vite)
# ==========================================
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==========================================
# Giai đoạn 2: Runtime (PHP 8.2-FPM + Nginx + Supervisor)
# ==========================================
FROM php:8.2-fpm-bookworm

# Cài đặt các gói hệ thống cần thiết, Nginx, Supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    git \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    ca-certificates \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        xml \
        bcmath \
        curl \
        zip \
        gd \
        intl \
        opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Cài đặt Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Sao chép toàn bộ mã nguồn
COPY . .

# Sao chép thư mục public/build đã build sẵn từ giai đoạn 1
COPY --from=frontend /app/public/build ./public/build

# Cài đặt thư viện PHP production
RUN composer install --no-dev --optimize-autoloader --no-interaction

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
