FROM denoland/deno:alpine-1.44.1
RUN apk add --no-cache nodejs
WORKDIR /app
COPY . .
RUN deno task cli:compile
CMD ["dist/cli"]
