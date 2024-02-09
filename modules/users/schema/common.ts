export interface User {
    id: string;
    username: string;
}

export interface Identity {
    id: string;
    type: IdentityType;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {

}
