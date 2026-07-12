FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY tailwind.config.js ./tailwind.config.js
COPY tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
