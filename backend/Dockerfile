FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:20-alpine

RUN addgroup -S strapi && adduser -S strapi -G strapi

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/config ./config
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/types ./types
COPY --from=build /app/tsconfig.json ./tsconfig.json

RUN chown -R strapi:strapi /app

USER strapi

ENV NODE_ENV=production

EXPOSE 1337

CMD ["npm", "start"]
