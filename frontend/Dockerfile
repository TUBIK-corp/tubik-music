FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install -g vite
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
