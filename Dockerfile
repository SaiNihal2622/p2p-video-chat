# Multi-stage Dockerfile for the P2P signaling server.
# Stage 1: build/install deps
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY src/signaling-server.js ./src/

# Stage 2: minimal runtime (small, secure image)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
# Non-root user for security
USER node
EXPOSE 8080
CMD ["node", "src/signaling-server.js"]
