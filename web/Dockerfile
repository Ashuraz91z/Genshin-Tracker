FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=8788 DATABASE_PATH=/data/tracker.sqlite DOWNLOAD_PATH=/app/downloads/kamera.zip
COPY --from=builder /app/.next/standalone ./
COPY dist/GenshinTracker-KameraFR-0.7.2.zip ./downloads/kamera.zip
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8788
CMD ["node", "server.js"]
