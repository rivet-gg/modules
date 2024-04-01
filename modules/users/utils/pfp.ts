import { ModuleContext } from "../module.gen.ts";
import { User } from "./types.ts";

const EXPIRY_SECS = 60 * 60 * 24; // 1 day

type UserWithUploadidInfo = Omit<User, "profilePictureUrl"> & { avatarUploadId: string | null };

export async function withPfpUrls<T extends ModuleContext>(
    ctx: T,
    users: UserWithUploadidInfo[],
): Promise<User[]> {
    const fileRefs = users
        .filter(user => user.avatarUploadId)
        .map(user => ({ uploadId: user.avatarUploadId!, path: "profile-picture" }));

    const { files } = await ctx.modules.uploads.getPublicFileUrls({
        files: fileRefs,
        expirySeconds: EXPIRY_SECS,
    });

    const map = new Map(files.map((file) => [file.uploadId, file.url]));

    const completeUsers: User[] = [];
    for (const user of users) {
        if (user.avatarUploadId && map.has(user.avatarUploadId)) {
            const profilePictureUrl = map.get(user.avatarUploadId)!;
            completeUsers.push({ ...user, profilePictureUrl });
        } else {
            completeUsers.push({ ...user, profilePictureUrl: null });
        }
    }

    return completeUsers;
}
