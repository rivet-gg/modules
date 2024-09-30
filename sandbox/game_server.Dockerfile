FROM node:20-alpine
RUN adduser -D server
WORKDIR /app

COPY sdk ./sdk
COPY game_server ./game_server
WORKDIR /app/game_server
RUN yarn --frozen-lockfile

RUN chown -R server:server /app
USER server
EXPOSE 7777

CMD ["node", "dist/index.js"]

