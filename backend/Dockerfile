FROM node:26-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:26-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5002

CMD ["node", "dist/server.js"]
