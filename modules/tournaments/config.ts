export interface BlumintProdEnvironment {
    apiToken: string;
}

export interface BlumintTestEnvironment {}

export type BlumintEnvironment = { prod: BlumintProdEnvironment } | { test: BlumintTestEnvironment };

export interface Config {
    environment: BlumintEnvironment;
}