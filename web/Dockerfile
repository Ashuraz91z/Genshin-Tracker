FROM node:24-alpine
WORKDIR /app
COPY web/ ./
COPY dist/GenshinTracker-KameraFR-0.2.0.zip /app/downloads/kamera.zip
RUN mkdir -p /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=8788 DATABASE_PATH=/data/tracker.sqlite DOWNLOAD_PATH=/app/downloads/kamera.zip
EXPOSE 8788
CMD ["node", "server.mjs"]
