FROM node:20-bullseye
WORKDIR /app
COPY package*.json ./
# keep devDependencies for dev image:
RUN npm ci
COPY . .
# optional: EXPOSE 3030
CMD ["npm","run","dev"]
