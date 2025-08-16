# Use Node LTS
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production

COPY . .

# Set production defaults
ENV NODE_ENV=production
ENV PORT=4001

EXPOSE 4001
CMD ["node", "server.js"]
