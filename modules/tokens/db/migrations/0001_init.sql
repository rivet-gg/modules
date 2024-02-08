CREATE TABLE tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    token TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    meta JSONB NOT NULL,
    trace JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT timezone('UTC', now()),
    expire_at TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX ON tokens (token);

