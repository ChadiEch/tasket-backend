# Use Node.js 18 alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Start the application
CMD ["node", "server.js"]