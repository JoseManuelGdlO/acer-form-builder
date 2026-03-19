# Build stage
FROM node:20-alpine AS builder

# Zona horaria
ENV TZ=America/Mexico_City

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies and sequelize-cli for migrations
RUN npm ci --only=production && \
    npm install -g sequelize-cli

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy runtime scripts (OpenAPI generator, etc.)
COPY --from=builder /app/scripts ./scripts

# Copy necessary files for migrations and seeders
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/seeders ./src/seeders
COPY --from=builder /app/.sequelizerc ./.sequelizerc
COPY --from=builder /app/src/config/database.js ./src/config/database.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start script that runs migrations, seeders, and then starts the server
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
