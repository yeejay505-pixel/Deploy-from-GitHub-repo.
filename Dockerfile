FROM mcr.microsoft.com/playwright:v1.55.0-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
ENV PORT=8080
ENV PLAYWRIGHT_HEADLESS=true
EXPOSE 8080
CMD ["npm","start"]
