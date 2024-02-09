CREATE TABLE friends (
    user_id_a UUID NOT NULL,
    user_id_b UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (user_id_a, user_id_b),
    CONSTRAINT user_id_order_check CHECK (user_id_a < user_id_b)
);

CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT timezone('utc', now()),
    declined_at TIMESTAMP,
    accepted_at TIMESTAMP
);

CREATE UNIQUE INDEX ON friend_requests (sender_user_id, target_user_id) WHERE (declined_at IS NULL AND accepted_at IS NULL);
