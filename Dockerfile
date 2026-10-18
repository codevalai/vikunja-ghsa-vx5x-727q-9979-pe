# Multi-stage production container for Vikunja (GHSA-vx5x-727q-9979): Permissive CORS Cross-Origin Data Exfiltration
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 8080
USER node
CMD ["node", "dist/server.js"]
