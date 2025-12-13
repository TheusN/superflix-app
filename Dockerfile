FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY api/package*.json ./api/

# Install dependencies
RUN cd api && npm install --production

# Copy app files
COPY . .

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:80/health || exit 1

# Start server
ENV PORT=80
CMD ["node", "api/server.js"]
