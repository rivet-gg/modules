# Use Debian instead of Alpine because of issues with Prisma & gcc

FROM denoland/deno:debian-1.44.1 AS build
# Required for installing Prisma dependencies
RUN apt-get update \
    && apt-get install -y nodejs npm unzip
WORKDIR /app
COPY . .
RUN deno task cli:compile

FROM denoland/deno:debian-1.44.1
# Required for Git dependencies
RUN apt-get update \
    && apt-get install -y git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/dist/cli /usr/bin/opengb
ENV RUNNING_IN_DOCKER=1
RUN VERBOSE=1 opengb _internal prewarm-prisma
ENTRYPOINT ["/usr/bin/opengb"]

