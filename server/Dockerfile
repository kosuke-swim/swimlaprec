FROM node:20-slim

# FFmpeg + node-canvas dependencies + Japanese fonts
RUN apt-get update && apt-get install -y \
  ffmpeg \
  fonts-noto-cjk \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

EXPOSE 8080
CMD ["node", "dist/server.js"]
