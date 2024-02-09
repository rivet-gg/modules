CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL
);

CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT timezone('UTC', now())
);

CREATE TABLE identity_guests (
    identity_id UUID PRIMARY KEY REFERENCES identities(id) ON DELETE CASCADE
);
