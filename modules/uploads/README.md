# Uploads

The uploads module in Open Game Backend provides a robust system for handling file uploads in your game. It allows you to securely store and manage various types of files, such as user-generated content, game assets, or any other binary data your game might need to handle.

## Overview

The uploads module offers the following key features:

1. Secure file uploading
2. Support for both single-part and multi-part uploads
3. File metadata management
4. Presigned URLs for direct client-side uploads
5. File retrieval and deletion

## Getting Started

To use the uploads module in your Open Game Backend project, you'll need to ensure it's properly configured in your `backend.json` file. Here's an example configuration:

<CodeGroup>
```json backend.json
{
  "modules": {
    "uploads": {
      "config": {
        "maxUploadSize": "30mib",
        "maxMultipartUploadSize": "10gib",
        "maxFilesPerUpload": 10,
        "defaultMultipartChunkSize": "10mib"
      }
    }
  }
}
```
</CodeGroup>

Let's break down these configuration options:

- `maxUploadSize`: The maximum size for a single-part upload (default: 30 MiB)
- `maxMultipartUploadSize`: The maximum size for a multi-part upload (default: 10 GiB)
- `maxFilesPerUpload`: The maximum number of files allowed in a single upload request (default: 10)
- `defaultMultipartChunkSize`: The default chunk size for multi-part uploads (default: 10 MiB)

## Core Concepts

### Upload Process

The upload process in the uploads module consists of three main steps:

1. **Prepare**: Initialize the upload and get presigned URLs for uploading.
2. **Upload**: Use the presigned URLs to upload file data directly to storage.
3. **Complete**: Finalize the upload process.

### Single-part vs Multi-part Uploads

- **Single-part uploads** are suitable for smaller files (up to 30 MiB by default).
- **Multi-part uploads** are used for larger files, allowing them to be uploaded in chunks.

## API Reference

### Prepare Upload

Prepares an upload by creating metadata and generating presigned URLs for file uploads.

<CodeGroup>
```typescript
async function prepareUpload(ctx: ScriptContext, req: {
  files: {
    path: string;
    contentLength: string;
    mime: string;
    multipart: boolean;
  }[];
  metadata?: unknown;
}): Promise<{
  upload: PresignedUpload;
}>
```
</CodeGroup>

#### Parameters:

- `files`: An array of file objects containing:
  - `path`: The desired path/name for the file
  - `contentLength`: The size of the file in bytes (as a string)
  - `mime`: The MIME type of the file
  - `multipart`: Whether to use multi-part upload (for large files)
- `metadata`: Optional metadata to associate with the upload

#### Returns:

- `upload`: A `PresignedUpload` object containing upload details and presigned URLs for each file

### Complete Upload

Finalizes an upload after all files have been uploaded.

<CodeGroup>
```typescript
async function completeUpload(ctx: ScriptContext, req: {
  uploadId: string;
}): Promise<{
  upload: UploadWithoutFiles;
}>
```
</CodeGroup>

#### Parameters:

- `uploadId`: The ID of the upload to complete

#### Returns:

- `upload`: An `UploadWithoutFiles` object containing upload details

### Fetch Upload Metadata

Retrieves metadata for one or more uploads.

<CodeGroup>
```typescript
async function fetchUploadMetadata(ctx: ScriptContext, req: {
  uploadIds: string[];
  includeFiles?: boolean;
}): Promise<{
  uploads: UploadWithOptionalFiles[];
}>
```
</CodeGroup>

#### Parameters:

- `uploadIds`: An array of upload IDs to fetch
- `includeFiles`: Whether to include file details in the response (optional)

#### Returns:

- `uploads`: An array of `UploadWithOptionalFiles` objects containing upload details

### Fetch Public File URLs

Generates public URLs for accessing uploaded files.

<CodeGroup>
```typescript
async function fetchPublicFileUrls(ctx: ScriptContext, req: {
  uploadId: string;
  filePaths: string[];
  expirySeconds?: number;
}): Promise<{
  files: DownloadableFile[];
}>
```
</CodeGroup>

#### Parameters:

- `uploadId`: The ID of the upload containing the files
- `filePaths`: An array of file paths to generate URLs for
- `expirySeconds`: The number of seconds the URLs should remain valid (optional)

#### Returns:

- `files`: An array of `DownloadableFile` objects containing file details and public URLs

### Delete Upload

Removes an upload and its associated files from storage.

<CodeGroup>
```typescript
async function deleteUpload(ctx: ScriptContext, req: {
  uploadId: string;
}): Promise<{
  bytesDeleted: string;
}>
```
</CodeGroup>

#### Parameters:

- `uploadId`: The ID of the upload to delete

#### Returns:

- `bytesDeleted`: The number of bytes deleted (as a string)

## Usage Examples

### Preparing and Completing a Single-part Upload

Here's an example of how to prepare and complete a single-part upload:

<CodeGroup>
```typescript
import { ScriptContext } from "opengb";

export async function uploadProfilePicture(ctx: ScriptContext, req: {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}) {
  // Prepare the upload
  const { upload } = await ctx.modules.uploads.prepare({
    files: [{
      path: `users/${req.userId}/profile-picture/${req.fileName}`,
      contentLength: req.fileSize.toString(),
      mime: req.mimeType,
      multipart: false
    }],
    metadata: { userId: req.userId }
  });

  // Return the presigned URL to the client
  const presignedUrl = upload.files[0].presignedChunks[0].url;
  
  // The client would use this URL to upload the file directly

  // After the client has uploaded the file, complete the upload
  await ctx.modules.uploads.complete({ uploadId: upload.id });

  return { message: "Profile picture uploaded successfully" };
}
```
</CodeGroup>

### Handling a Multi-part Upload

For larger files, you'll want to use multi-part uploads. Here's an example:

<CodeGroup>
```typescript
import { ScriptContext } from "opengb";

export async function uploadLargeFile(ctx: ScriptContext, req: {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}) {
  // Prepare the multi-part upload
  const { upload } = await ctx.modules.uploads.prepare({
    files: [{
      path: `users/${req.userId}/large-files/${req.fileName}`,
      contentLength: req.fileSize.toString(),
      mime: req.mimeType,
      multipart: true
    }],
    metadata: { userId: req.userId }
  });

  // Return the presigned URLs for each chunk to the client
  const presignedChunks = upload.files[0].presignedChunks;
  
  // The client would use these URLs to upload each chunk of the file

  // After the client has uploaded all chunks, complete the upload
  await ctx.modules.uploads.complete({ uploadId: upload.id });

  return { message: "Large file uploaded successfully" };
}
```
</CodeGroup>

### Retrieving and Using Uploaded Files

Here's how you can fetch and use the URLs for uploaded files:

<CodeGroup>
```typescript
import { ScriptContext } from "opengb";

export async function getProfilePictureUrl(ctx: ScriptContext, req: {
  userId: string;
  uploadId: string;
}) {
  const { files } = await ctx.modules.uploads.fetchPublicFileUrls({
    uploadId: req.uploadId,
    filePaths: [`users/${req.userId}/profile-picture`],
    expirySeconds: 3600 // URL will be valid for 1 hour
  });

  if (files.length === 0) {
    throw new Error("Profile picture not found");
  }

  return { profilePictureUrl: files[0].url };
}
```
</CodeGroup>

## Best Practices

1. **Use multi-part uploads for large files**: This improves reliability and allows for resumable uploads.
2. **Set appropriate expiry times for public URLs**: Balance security with usability when generating public file URLs.
3. **Validate file types and sizes**: Implement checks on the client-side and server-side to ensure only allowed file types and sizes are uploaded.
4. **Use meaningful file paths**: Organize your uploads with a clear directory structure (e.g., `users/{userId}/profile-pictures/{fileName}`).
5. **Clean up unused uploads**: Implement a system to periodically delete unused or temporary uploads to manage storage efficiently.

## Error Handling

The uploads module can throw various errors. Here are some common ones to handle:

- `no_files`: Thrown when trying to create an upload with no files.
- `too_many_files`: Thrown when the number of files exceeds `maxFilesPerUpload`.
- `duplicate_paths`: Thrown when two files in the same upload have the same path.
- `size_limit_exceeded`: Thrown when the total upload size exceeds the configured limit.
- `upload_not_found`: Thrown when trying to operate on a non-existent upload.
- `upload_already_completed`: Thrown when trying to complete an already completed upload.

Always wrap your upload operations in try-catch blocks and handle these errors gracefully in your game logic.
