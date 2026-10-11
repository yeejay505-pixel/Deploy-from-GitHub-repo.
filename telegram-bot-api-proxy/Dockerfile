FROM aiogram/telegram-bot-api:latest

USER root
RUN apk add --no-cache nginx

COPY telegram-bot-api-proxy/nginx.conf /etc/nginx/http.d/default.conf
COPY telegram-bot-api-proxy/start.sh /usr/local/bin/start-telegram-proxy
RUN chmod +x /usr/local/bin/start-telegram-proxy \
    && mkdir -p /run/nginx \
    && chown -R telegram-bot-api:telegram-bot-api /run/nginx /var/lib/nginx

ENTRYPOINT ["/usr/local/bin/start-telegram-proxy"]
