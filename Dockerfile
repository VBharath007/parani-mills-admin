FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend/ ./

ENV PORT=5001
EXPOSE 5001

CMD ["node", "server.js"]
