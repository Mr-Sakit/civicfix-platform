const CATEGORY_NAMES = [
  "Road Damage",
  "Street Lighting",
  "Waste Management",
  "Water Leak",
  "Public Safety"
];

const categoryRules = [
  {
    category: "Road Damage",
    severity: "high",
    keywords: ["road", "pothole", "asphalt", "street", "sidewalk", "crack", "traffic"]
  },
  {
    category: "Street Lighting",
    severity: "medium",
    keywords: ["light", "lamp", "electric", "bulb", "streetlight"]
  },
  {
    category: "Waste Management",
    severity: "medium",
    keywords: ["trash", "waste", "garbage", "bin", "sanitation", "litter", "dump"]
  },
  {
    category: "Water Leak",
    severity: "critical",
    keywords: ["water", "pipe", "leak", "flood", "hydrant", "drain"]
  },
  {
    category: "Public Safety",
    severity: "critical",
    keywords: ["safety", "wire", "hazard", "danger", "exposed", "unsafe"]
  }
];

export const categorizeIssueFallback = async ({ title = "", description = "", imageName = "" }) => {
  const text = `${title} ${description} ${imageName}`.toLowerCase();
  const match = categoryRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));

  const result = match ?? { category: "Road Damage", severity: "medium", keywords: [] };

  return {
    category: result.category,
    severity: result.severity,
    confidence: match ? 0.86 : 0.62,
    summary: match
      ? `Keyword match matched context for ${result.category.toLowerCase()} triage.`
      : "Keyword-match fallback completed triage with a default category."
  };
};

export const matchPhotoToDescriptionFallback = async () => ({
  matches: true,
  confidence: 0.5,
  reason: "Fallback mode: photo/description consistency not verified by AI."
});

export const compareBeforeAfterPhotosFallback = async () => ({
  resolved: true,
  confidence: 0.5,
  reason: "Fallback mode: before/after comparison not verified by AI."
});

export const comparePhotoSimilarityFallback = async () => ({
  similar: false,
  confidence: 0
});

export const KNOWN_CATEGORIES = CATEGORY_NAMES;
