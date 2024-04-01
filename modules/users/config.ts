export interface Config {
    maxProfilePictureBytes: number;
    allowedMimes?: string[];
}

export const DEFAULT_MIME_TYPES = [
    "image/jpeg",
    "image/png",
];
