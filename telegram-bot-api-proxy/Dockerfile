FROM aiogram/telegram-bot-api:latest

USER root
RUN apk add --no-cache nginx \
    && sed -i 's/^user .*/user telegram-bot-api;/' /etc/nginx/nginx.conf

COPY nginx.conf /etc/nginx/http.d/default.conf
COPY start.sh /usr/local/bin/start-telegram-proxy
RUN chmod +x /usr/local/bin/start-telegram-proxy \
    && mkdir -p /run/nginx \
    && chown -R telegram-bot-api:telegram-bot-api /run/nginx /var/lib/nginx

ENTRYPOINT ["/usr/local/bin/start-telegram-proxy"]
