FROM node:26-alpine

WORKDIR /app

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ARG VITE_GOOGLE_MAPS_API_KEY=""

COPY package*.json ./
RUN npm install

COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY tailwind.config.js ./tailwind.config.js
COPY tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN npm run build
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "preview"]
