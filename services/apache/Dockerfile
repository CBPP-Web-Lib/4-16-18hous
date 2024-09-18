FROM php:apache

RUN apt-get update -y && \
  apt-get install -y libonig-dev libxml2-dev zip unzip git && \
  apt-get install -y zlib1g-dev libpng-dev libfreetype6-dev libjpeg62-turbo-dev libzip-dev

RUN docker-php-ext-install mysqli && \
  docker-php-ext-install mbstring && \
  docker-php-ext-install xml && \
  docker-php-ext-install gd && \
  docker-php-ext-install zip

ENV APACHE_DOCUMENT_ROOT=/var/www/html

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf && \
  sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN pecl install xdebug

RUN a2enmod headers
RUN a2enmod rewrite

EXPOSE 9000