FROM node:16.13.0-alpine3.14

WORKDIR /app

RUN apk add --no-cache git

# Build Rivet libs
COPY sdk/ sdk/
COPY server/package.json server/yarn.lock server/
RUN cd server && yarn install --production && yarn add typescript

# Build server
COPY server/ server/
RUN cd server && yarn run build

RUN adduser -D server
USER server

CMD ["node", "server/dist/index.js"]

