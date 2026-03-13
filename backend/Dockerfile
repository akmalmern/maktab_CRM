FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM deps AS dev

ENV NODE_ENV=development
EXPOSE 5000

CMD ["npm", "run", "dev"]

FROM deps AS migrate

ENV NODE_ENV=production

CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/package*.json ./
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

RUN npm prune --omit=dev \
  && mkdir -p /app/uploads/avatars /app/uploads/docs \
  && chown -R node:node /app

USER node
EXPOSE 5000

CMD ["node", "src/server.js"]
