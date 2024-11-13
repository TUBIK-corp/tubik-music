FROM node:16-alpine

WORKDIR /app

RUN chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN npm install

COPY --chown=node:node . .

RUN mkdir -p node_modules/.vite && chmod 777 node_modules/.vite

CMD ["npm", "run", "dev"]
