import OpenAI from "openai";
import { config } from "./config.js";

const categoryRules = [
  {
    category: "Road Damage",
    severity: "high",
    keywords: ["road", "pothole", "asphalt", "street", "sidewalk", "crack", "traffic"]
  },
  {
    category: "Waste Management",
    severity: "medium",
    keywords: ["trash", "waste", "garbage", "bin", "sanitation", "litter"]
  },
  {
    category: "Street Lighting",
    severity: "critical",
    keywords: ["light", "lamp", "streetlight", "electric", "power", "dark"]
  },
  {
    category: "Water Leak",
    severity: "critical",
    keywords: ["water", "pipe", "leak", "flood", "drainage"]
  },
  {
    category: "Public Safety",
    severity: "high",
    keywords: ["graffiti", "vandal", "danger", "safety", "broken", "hazard"]
  }
];

const allowedCategories = categoryRules.map((rule) => rule.category);
const allowedSeverities = ["low", "medium", "high", "critical"];
let openaiClient;

const getOpenAIClient = () => {
  if (!config.openai.apiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
};

const parseJsonObject = (text) => {
  const match = String(text ?? "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("OpenAI response did not contain a JSON object");
  return JSON.parse(match[0]);
};

const normalizeAnalysis = (analysis, fallback) => {
  const category = allowedCategories.includes(analysis?.category)
    ? analysis.category
    : fallback.category;
  const severity = allowedSeverities.includes(analysis?.severity)
    ? analysis.severity
    : fallback.severity;
  const confidence = Number(analysis?.confidence);

  return {
    category,
    severity,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : fallback.confidence,
    summary: String(analysis?.summary ?? fallback.summary).slice(0, 240)
  };
};

export const analyzeIssueFallback = ({ title = "", description = "", imageName = "" }) => {
  const text = `${title} ${description} ${imageName}`.toLowerCase();
  const match = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );

  const result = match ?? {
    category: "ROADS",
    severity: "medium",
    keywords: []
  };

  return {
    category: result.category,
    severity: result.severity,
    confidence: match ? 0.86 : 0.62,
    summary: match
      ? `Fallback triage matched report context to ${result.category}.`
      : "Fallback triage selected a default civic infrastructure category."
  };
};

export const analyzeIssueImage = async ({
  title = "",
  description = "",
  imageName = "",
  imageDataUrl = ""
}) => {
  const fallback = analyzeIssueFallback({ title, description, imageName });
  const client = getOpenAIClient();

  if (!client || !imageDataUrl) return fallback;

  try {
    const response = await client.responses.create({
      model: config.openai.model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Classify this civic issue for a city operations dashboard. " +
                `Use exactly one category from: ${allowedCategories.join(", ")}. ` +
                "Return only JSON with keys category, severity, confidence, summary. " +
                "Severity must be low, medium, high, or critical. " +
                `Title: ${title}\nDescription: ${description}\nImage file name: ${imageName}`
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ],
      text: { format: { type: "json_object" } },
      max_output_tokens: 250
    });

    return normalizeAnalysis(parseJsonObject(response.output_text), fallback);
  } catch (error) {
    console.warn(`OpenAI issue analysis failed, using fallback: ${error.message}`);
    return fallback;
  }
};

export const verifyIssuePhoto = async ({
  title = "",
  description = "",
  imageDataUrl = ""
}) => {
  const fallback = {
    matches: true,
    confidence: 0.7,
    reason: "Fallback verification accepted the photo for manual review."
  };
  const client = getOpenAIClient();

  if (!client || !imageDataUrl) return fallback;

  try {
    const response = await client.responses.create({
      model: config.openai.model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Check whether this uploaded photo plausibly matches the citizen's civic issue report. " +
                "Return only JSON with keys matches, confidence, reason. " +
                `Title: ${title}\nDescription: ${description}`
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ],
      text: { format: { type: "json_object" } },
      max_output_tokens: 200
    });

    const parsed = parseJsonObject(response.output_text);
    return {
      matches: Boolean(parsed.matches),
      confidence: Number.isFinite(Number(parsed.confidence))
        ? Math.min(1, Math.max(0, Number(parsed.confidence)))
        : fallback.confidence,
      reason: String(parsed.reason ?? fallback.reason).slice(0, 240)
    };
  } catch (error) {
    console.warn(`OpenAI photo verification failed, using fallback: ${error.message}`);
    return fallback;
  }
};
