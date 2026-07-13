import { BlobServiceClient } from "@azure/storage-blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const localUploadRoot = path.resolve(process.cwd(), "uploads");

const normalizeBlobName = (fileName) => fileName.replace(/^\/+/, "");

const getAzureContainerClient = () => {
  if (!config.storage.azureConnectionString) {
    const error = new Error(
      "AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER=azure-blob"
    );
    error.statusCode = 500;
    throw error;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.storage.azureConnectionString
  );
  return blobServiceClient.getContainerClient(config.storage.azureBlobContainer);
};

export const ensureStorageReady = async () => {
  if (config.storage.provider === "azure-blob") {
    const containerClient = getAzureContainerClient();
    await containerClient.createIfNotExists();
    return;
  }

  await mkdir(localUploadRoot, { recursive: true });
};

export const getLocalUploadRoot = () => localUploadRoot;

export const saveImageObject = async ({ fileName, buffer, mimeType }) => {
  if (config.storage.provider === "azure-blob") {
    const containerClient = getAzureContainerClient();
    const blobName = normalizeBlobName(fileName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobCacheControl: "public, max-age=31536000, immutable"
      },
      metadata: {
        source: "civicfix-platform"
      }
    });

    return {
      provider: "azure-blob",
      objectPath: blobName,
      publicUrl: `/api/photos/${encodeURIComponent(blobName)}`
    };
  }

  await mkdir(localUploadRoot, { recursive: true });
  const filePath = path.join(localUploadRoot, fileName);
  await writeFile(filePath, buffer);

  return {
    provider: "local",
    objectPath: `/uploads/${fileName}`,
    publicUrl: `/uploads/${fileName}`
  };
};

export const loadImageObject = async (objectPath) => {
  if (config.storage.provider === "azure-blob") {
    const containerClient = getAzureContainerClient();
    const blobClient = containerClient.getBlobClient(normalizeBlobName(objectPath));
    const downloadResponse = await blobClient.download();
    const chunks = [];

    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  const fileName = path.basename(objectPath);
  return readFile(path.join(localUploadRoot, fileName));
};
