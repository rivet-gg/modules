deno task build
docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli:v6.4.0 generate \
    -i /local/dist/openapi.json \
    -g typescript-fetch \
    -o /local/dist/sdks/typescript/

