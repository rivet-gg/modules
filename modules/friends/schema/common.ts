export interface Friend {
    user_id: string;
    created_at: string;
}

export interface FriendRequest {
    id: string;
    sender_user_id: string;
    target_user_id: string;
    created_at: string;
    declined_at: string | null;
    accepted_at: string | null;
}