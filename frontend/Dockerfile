FROM node:16-alpine

WORKDIR /app

RUN addgroup -S nodegroup && adduser -S node -G nodegroup && \
    chown -R node:nodegroup /app

USER node

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
