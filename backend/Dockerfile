FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install && npm install @google-cloud/firestore

COPY src ./src
COPY server.js ./server.js

ENV PORT=5001
EXPOSE 5001

CMD ["node", "server.js"]
