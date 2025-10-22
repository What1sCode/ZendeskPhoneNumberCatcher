# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since we don't have package-lock.json)
RUN npm install --omit=dev

# Copy application code
COPY . .

# Expose port (Railway will set PORT env variable)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
