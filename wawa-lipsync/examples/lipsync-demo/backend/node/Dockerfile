FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Use PORT from environment or default to 8080
ENV PORT=8080

# Start the server
CMD ["node", "src/server.js"]

