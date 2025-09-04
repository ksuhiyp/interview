# Stage 1: build application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Install all dependencies for build
RUN npm install
COPY . .
# Build the Nest application (TypeScript)
RUN npm run build

# Stage 2: create production image
FROM node:18-alpine
WORKDIR /usr/src/app
# Install only production dependencies
COPY package*.json ./
RUN npm install --production
# Copy built artifacts
COPY --from=builder /usr/src/app/dist ./dist

# Expose application port (Nest defaults to 3000)
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
