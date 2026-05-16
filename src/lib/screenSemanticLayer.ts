export interface ScreenSemanticSummary {
  brightness: "dark" | "balanced" | "bright";
  contrast: "low" | "medium" | "high";
  textLikeDensity: number;
  dominantRegions: string[];
  probableContent: "document" | "code_or_table" | "media" | "blank_or_static";
}

export function analyzeScreenSemantics(imageData: ImageData): ScreenSemanticSummary {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const cellSize = 16;
  let sum = 0;
  let sumSq = 0;
  let sampled = 0;
  let edgeCount = 0;
  const regions = { top: 0, center: 0, bottom: 0, left: 0, right: 0 };

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const idx = (y * width + x) * 4;
      const rightIdx = (y * width + Math.min(x + cellSize, width - 1)) * 4;
      const downIdx = (Math.min(y + cellSize, height - 1) * width + x) * 4;
      const lum = luminance(data, idx);
      const rightLum = luminance(data, rightIdx);
      const downLum = luminance(data, downIdx);
      const edge = Math.abs(lum - rightLum) + Math.abs(lum - downLum);
      sum += lum;
      sumSq += lum * lum;
      sampled += 1;
      if (edge > 90) edgeCount += 1;
      if (edge > 60) {
        if (y < height * 0.25) regions.top += 1;
        if (y > height * 0.70) regions.bottom += 1;
        if (x < width * 0.30) regions.left += 1;
        if (x > width * 0.70) regions.right += 1;
        if (x > width * 0.30 && x < width * 0.70 && y > height * 0.25 && y < height * 0.75) regions.center += 1;
      }
    }
  }

  const avg = sampled ? sum / sampled : 0;
  const variance = sampled ? sumSq / sampled - avg * avg : 0;
  const textLikeDensity = sampled ? edgeCount / sampled : 0;
  const dominantRegions = Object.entries(regions)
    .filter(([, count]) => count > Math.max(2, edgeCount * 0.12))
    .map(([region]) => region);
  const contrast = variance > 2400 ? "high" : variance > 800 ? "medium" : "low";
  const brightness = avg > 180 ? "bright" : avg < 70 ? "dark" : "balanced";
  const probableContent = inferContent(textLikeDensity, contrast, dominantRegions.length);

  return { brightness, contrast, textLikeDensity: Number(textLikeDensity.toFixed(3)), dominantRegions, probableContent };
}

function luminance(data: Uint8ClampedArray, idx: number): number {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
}

function inferContent(textLikeDensity: number, contrast: ScreenSemanticSummary["contrast"], regionCount: number): ScreenSemanticSummary["probableContent"] {
  if (textLikeDensity < 0.025 && contrast === "low") return "blank_or_static";
  if (textLikeDensity > 0.22 && regionCount >= 3) return "code_or_table";
  if (textLikeDensity > 0.08) return "document";
  return "media";
}

export function formatScreenSemanticSummary(summary: ScreenSemanticSummary): string {
  return `screen:${summary.probableContent};brightness:${summary.brightness};contrast:${summary.contrast};textDensity:${summary.textLikeDensity};regions:${summary.dominantRegions.join("|") || "none"}`;
}
