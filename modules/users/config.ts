import { Module } from "./module.gen.ts";

export interface Config {
    maxProfilePictureSize: Module.uploads.UploadSize;
    allowedMimes?: string[];
}

export const DEFAULT_MIME_TYPES = [
    "image/jpeg",
    "image/png",
];
