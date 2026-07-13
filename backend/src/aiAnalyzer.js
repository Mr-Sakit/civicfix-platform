const categoryRules = [
  {
    category: "ROADS",
    severity: "high",
    keywords: ["road", "pothole", "asphalt", "street", "sidewalk", "crack", "traffic"]
  },
  {
    category: "SANITATION",
    severity: "medium",
    keywords: ["trash", "waste", "garbage", "bin", "sanitation", "litter"]
  },
  {
    category: "UTILITIES",
    severity: "critical",
    keywords: ["light", "electric", "water", "pipe", "utility", "power", "leak"]
  }
];

export const analyzeIssueImage = async ({ title = "", description = "", imageName = "" }) => {
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
      ? `Mock AI matched visual/context keywords for ${result.category.toLowerCase()} triage.`
      : "Mock AI completed image triage with a default infrastructure category."
  };
};
