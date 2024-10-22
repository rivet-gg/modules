export interface Config {
    providers: Record<string, ProviderEndpoints | string>;
}

export interface ProviderEndpoints {
    authorization: string;
    token: string;
    userinfo: string;
    scopes: string;
    userinfoKey: string;
}
