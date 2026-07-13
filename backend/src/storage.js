import { BlobServiceClient } from "@azure/storage-blob";
import { config } from "./config.js";

const localImages = new Map();

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
  }
};

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

  const objectPath = normalizeBlobName(fileName);
  localImages.set(objectPath, {
    buffer: Buffer.from(buffer),
    mimeType
  });

  return {
    provider: "local-memory",
    objectPath,
    publicUrl: `/api/photos/${encodeURIComponent(objectPath)}`
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

  const image = localImages.get(normalizeBlobName(objectPath));
  if (!image) {
    const error = new Error("Local image object not found");
    error.statusCode = 404;
    throw error;
  }

  return image.buffer;
};
