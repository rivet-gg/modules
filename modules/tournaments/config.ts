export interface BlumintProdEnvironment {
    apiToken: string;
}

export interface BlumintTestEnvironment {}

export type BlumintEnvironment = { prod: BlumintProdEnvironment } | { test: BlumintTestEnvironment };

export interface BlumintOpenGBUserProvider {}
export interface BlumintExternalUserProvider {
    userLookupEndpoint: string;
}

export type UserProvider = { external: BlumintExternalUserProvider }
 | { test: {} };
// | { opengb: BlumintOpenGBUserProvider }

export interface Config {
    environment: BlumintEnvironment;
    userProvider: UserProvider;
}