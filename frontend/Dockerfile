FROM node:26-alpine

WORKDIR /app

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
# trivy:ignore:AVD-DS-0031: this is a Google Maps browser API key, meant to ship inside
# public client JS by design (Vite inlines it at build time). It carries no server-side
# privilege; access is restricted via HTTP-referrer allowlisting in Google Cloud Console,
# not by keeping it out of the bundle. There is no way to inline a VITE_-prefixed value
# without passing it through a build ARG.
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
