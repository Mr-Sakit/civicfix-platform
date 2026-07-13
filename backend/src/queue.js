import { QueueServiceClient } from "@azure/storage-queue";
import { config } from "./config.js";

const getAzureQueueClient = () => {
  if (!config.queue.azureConnectionString) {
    const error = new Error(
      "AZURE_STORAGE_CONNECTION_STRING is required when QUEUE_PROVIDER=azure-queue"
    );
    error.statusCode = 500;
    throw error;
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(
    config.queue.azureConnectionString
  );
  return queueServiceClient.getQueueClient(config.queue.azureQueueName);
};

const encodeMessage = (payload) => Buffer.from(JSON.stringify(payload), "utf8").toString("base64");

const decodeMessage = (messageText) =>
  JSON.parse(Buffer.from(messageText, "base64").toString("utf8"));

export const ensureQueueReady = async () => {
  if (config.queue.provider !== "azure-queue") return;

  const queueClient = getAzureQueueClient();
  await queueClient.createIfNotExists();
};

export const enqueueImageAnalysisJob = async (payload) => {
  if (config.queue.provider !== "azure-queue") {
    return {
      enqueued: false,
      provider: config.queue.provider
    };
  }

  const queueClient = getAzureQueueClient();
  await queueClient.sendMessage(encodeMessage(payload));

  return {
    enqueued: true,
    provider: "azure-queue"
  };
};

export const receiveImageAnalysisJob = async () => {
  if (config.queue.provider !== "azure-queue") return null;

  const queueClient = getAzureQueueClient();
  const response = await queueClient.receiveMessages({
    numberOfMessages: 1,
    visibilityTimeout: 60
  });

  const message = response.receivedMessageItems[0];
  if (!message) return null;

  return {
    payload: decodeMessage(message.messageText),
    delete: () => queueClient.deleteMessage(message.messageId, message.popReceipt)
  };
};
