export * as glob from "https://esm.sh/glob@^10.3.10";
export * as tjs from "npm:typescript-json-schema@0.62.0";

// TODO: These load but cannot parse the file correctly
// TODO: If getting Symbol error, it's because you're trying to import ts-node from typescript-json-schema
// export * as tjs from "https://esm.sh/typescript-json-schema@0.62.0?bundle-deps&keep-names";
// export * as tjs from "https://esm.sh/@rivet-gg/typescript-json-schema@v0.64.0-rc.1?bundle-deps&target=deno";
