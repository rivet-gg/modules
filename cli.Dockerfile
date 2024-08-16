# # Use Debian instead of Alpine because of issues with Prisma & gcc
#
# FROM denoland/deno:debian-1.44.1 AS build
# # Required for installing Prisma dependencies
# RUN apt-get update \
#     && apt-get install -y nodejs npm unzip
# WORKDIR /app
# COPY . .
# RUN mkdir artifacts \
#     && deno task cli:compile
#
# FROM denoland/deno:debian-1.44.1
# # TODO: We install Java so that we can run the openapi generator directly in the sdk cli command.
# # TODO: We install Postgres since we can't connect to the Docker host daemon. Figure out how to cleanly run it in a separate container.
# # Required for Git dependencies
# RUN apt-get update \
#     && apt-get install -y --no-install-recommends git default-jre postgresql-15 postgresql-contrib sudo \
#     && rm -rf /var/lib/apt/lists/* \
#     && mkdir -p /var/lib/postgresql/data
# COPY --from=build /app/dist/cli /usr/bin/opengb
# ENV RUNNING_IN_DOCKER=1
# ENV _OPENGB_POSTGRES_DAEMON_DRIVER=native
# RUN VERBOSE=1 opengb _internal prewarm-prisma
# ENTRYPOINT ["/usr/bin/opengb"]

# HACK: Don't use build container because of problem with esbuild OGBEE-94

FROM denoland/deno:debian-1.44.1 AS build
# Required for installing Prisma dependencies
RUN apt-get update \
    && apt-get install -y nodejs npm unzip git default-jre postgresql-15 postgresql-contrib sudo \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/lib/postgresql/data
WORKDIR /app
COPY . .
RUN mkdir artifacts \
    && deno task cli:install
ENV RUNNING_IN_DOCKER=1
ENV _OPENGB_POSTGRES_DAEMON_DRIVER=native
RUN VERBOSE=1 opengb _internal prewarm-prisma
ENTRYPOINT ["opengb"]
