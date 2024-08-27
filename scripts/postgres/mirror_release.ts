#!/usr/bin/env -S deno run --allow-net --allow-env

import { S3Bucket } from "https://deno.land/x/s3@0.5.0/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";

const GITHUB_REPO = "https://github.com/theseus-rs/postgresql-binaries";
const BUCKET_NAME = "rivet-releases";
const BUCKET_FOLDER = "postgres";

interface ReleaseData {
  assets: {
    name: string;
    browser_download_url: string;
  }[];
}

async function mirrorRelease(releaseName: string) {
  const bucket = new S3Bucket({
    accessKeyID: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    bucket: BUCKET_NAME,
    region: "auto",
    endpointURL: "https://2a94c6a0ced8d35ea63cddc86c2681e7.r2.cloudflarestorage.com/rivet-releases",
  });

  const releaseUrl = `https://api.github.com/repos/theseus-rs/postgresql-binaries/releases/tags/${releaseName}`;
  console.log(`Fetching release information from ${releaseUrl}...`);
  const response = await fetch(releaseUrl);

  if (!response.ok) {
    console.error(`Failed to fetch release information. Status: ${response.status}`);
    Deno.exit(1);
  }

  const releaseData = await response.json() as ReleaseData;
  const assets = releaseData.assets;

  assert(assets.length > 0, `No files found for release ${releaseName}. Please check the release name and try again. You can find a list of all releases at ${GITHUB_REPO}/releases.`);

  console.log(`Found ${assets.length} files to mirror.`);

  for (const asset of assets) {
    const fileName = asset.name;
    const downloadUrl = asset.browser_download_url;
    const objectKey = `${BUCKET_FOLDER}/${releaseName}/${fileName}`;

    const existingObj = await bucket.headObject(objectKey);
    if (existingObj) {
      console.log(`Skipping ${fileName} (already exists)`);
    } else {
      console.log(`Downloading ${fileName}...`);
      const fileResponse = await fetch(downloadUrl);
      const fileData = await fileResponse.arrayBuffer();

      console.log(`Uploading ${fileName} to ${BUCKET_NAME}/${objectKey}...`);
      await bucket.putObject(objectKey, new Uint8Array(fileData));
      console.log(`Uploaded ${fileName}`);
    }
  }

  console.log(`Finished mirroring release ${releaseName}.`);
}

const release = Deno.env.get("RELEASE_NAME");
if (!release) {
  console.error("Please provide a release name via the RELEASE_NAME environment variable");
  Deno.exit(1);
}

await mirrorRelease(release);
