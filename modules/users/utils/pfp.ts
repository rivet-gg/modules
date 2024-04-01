import { ModuleContext } from "../module.gen.ts";
import { User } from "./types.ts";

const EXPIRY_SECS = 60 * 60 * 24; // 1 day

type UserWithUploadidInfo = Omit<User, "profilePictureUrl"> & { avatarUploadId: string | null };
type FileRef = { uploadId: string; path: string };

function getFileRefs(users: UserWithUploadidInfo[]) {
    const pairs: FileRef[] = [];
    for (const { avatarUploadId: uploadId } of users) {
        if (uploadId) {
            pairs.push({ uploadId: uploadId, path: "profile-picture" });
        }
    }
    return pairs;
}

export async function withPfpUrls<T extends ModuleContext>(
    ctx: T,
    users: UserWithUploadidInfo[],
): Promise<User[]> {
    const fileRefs = getFileRefs(users);

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
