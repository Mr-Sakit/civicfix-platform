import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";
import {
  categorizeIssueFallback,
  matchPhotoToDescriptionFallback,
  compareBeforeAfterPhotosFallback,
  comparePhotoSimilarityFallback,
  KNOWN_CATEGORIES
} from "./keywordFallback.js";

let client = null;
const getClient = () => {
  if (!config.gemini.apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(config.gemini.apiKey);
  return client;
};

const getModel = () => getClient()?.getGenerativeModel({ model: config.gemini.model }) ?? null;

const toInlinePart = (buffer, mimeType) => ({
  inlineData: { data: buffer.toString("base64"), mimeType }
});

const parseJsonResponse = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini response did not contain JSON");
  return JSON.parse(match[0]);
};

const safeLogError = (label, error) => {
  console.error(`Gemini call failed (${label}), using fallback:`, error.message);
};

export const categorizeIssue = async ({ title, description, imageBuffer, mimeType, imageName }) => {
  const model = getModel();
  if (!model || !imageBuffer) return categorizeIssueFallback({ title, description, imageName });

  try {
    const prompt = `You are triaging a civic-issue report for a city government app.
Categorize this report into EXACTLY one of these 5 categories: ${KNOWN_CATEGORIES.join(", ")}.
Title: ${title}
Description: ${description}
Respond with ONLY JSON: {"category": "<one of the 5 exact names>", "severity": "low"|"medium"|"high"|"critical", "confidence": 0-1 number, "summary": "one sentence"}`;

    const result = await model.generateContent([prompt, toInlinePart(imageBuffer, mimeType)]);
    const parsed = parseJsonResponse(result.response.text());

    if (!KNOWN_CATEGORIES.includes(parsed.category)) {
      throw new Error(`Gemini returned an unknown category: ${parsed.category}`);
    }

    return parsed;
  } catch (error) {
    safeLogError("categorizeIssue", error);
    return categorizeIssueFallback({ title, description, imageName });
  }
};

export const matchPhotoToDescription = async ({ title, description, imageBuffer, mimeType }) => {
  const model = getModel();
  if (!model || !imageBuffer) return matchPhotoToDescriptionFallback();

  try {
    const prompt = `A citizen reported a civic issue with this title/description:
Title: ${title}
Description: ${description}
Does the attached photo plausibly show this issue? Respond with ONLY JSON:
{"matches": true|false, "confidence": 0-1 number, "reason": "one short sentence"}`;

    const result = await model.generateContent([prompt, toInlinePart(imageBuffer, mimeType)]);
    return parseJsonResponse(result.response.text());
  } catch (error) {
    safeLogError("matchPhotoToDescription", error);
    return matchPhotoToDescriptionFallback();
  }
};

export const compareBeforeAfterPhotos = async ({
  beforeImageBuffer,
  beforeMimeType,
  afterImageBuffer,
  afterMimeType,
  issueDescription
}) => {
  const model = getModel();
  if (!model || !beforeImageBuffer || !afterImageBuffer) {
    return compareBeforeAfterPhotosFallback();
  }

  try {
    const prompt = `A crew member is verifying a fix for this civic issue: "${issueDescription}".
The first image is the ORIGINAL problem. The second image is the AFTER photo taken once the crew says it's fixed.
Judge whether the after photo shows the issue has actually been resolved. Respond with ONLY JSON:
{"resolved": true|false, "confidence": 0-1 number, "reason": "one short sentence"}`;

    const result = await model.generateContent([
      prompt,
      toInlinePart(beforeImageBuffer, beforeMimeType),
      toInlinePart(afterImageBuffer, afterMimeType)
    ]);
    return parseJsonResponse(result.response.text());
  } catch (error) {
    safeLogError("compareBeforeAfterPhotos", error);
    return compareBeforeAfterPhotosFallback();
  }
};

export const comparePhotoSimilarity = async ({ imageBufferA, mimeTypeA, imageBufferB, mimeTypeB }) => {
  const model = getModel();
  if (!model || !imageBufferA || !imageBufferB) return comparePhotoSimilarityFallback();

  try {
    const prompt = `Compare these two photos of possible civic infrastructure issues.
Do they show the SAME real-world problem (same pothole, same broken light, same leak, etc.), not just a similar type of issue? Respond with ONLY JSON:
{"similar": true|false, "confidence": 0-1 number}`;

    const result = await model.generateContent([
      prompt,
      toInlinePart(imageBufferA, mimeTypeA),
      toInlinePart(imageBufferB, mimeTypeB)
    ]);
    return parseJsonResponse(result.response.text());
  } catch (error) {
    safeLogError("comparePhotoSimilarity", error);
    return comparePhotoSimilarityFallback();
  }
};
