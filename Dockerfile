FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Data volume mount point
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000

CMD ["npm", "start"]
