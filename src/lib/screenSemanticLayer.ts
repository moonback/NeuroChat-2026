export interface ScreenTextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
}

export interface ScreenOcrHints {
  likelyReadableText: boolean;
  estimatedTextBlocks: number;
  textOrientation: "horizontal" | "vertical" | "mixed" | "unknown";
  regions: ScreenTextRegion[];
}

export interface ScreenSemanticSummary {
  brightness: "dark" | "balanced" | "bright";
  contrast: "low" | "medium" | "high";
  textLikeDensity: number;
  dominantRegions: string[];
  probableContent: "document" | "code_or_table" | "media" | "blank_or_static";
  ocrHints: ScreenOcrHints;
}

interface EdgeCell {
  x: number;
  y: number;
  edge: number;
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
  const edgeCells: EdgeCell[] = [];

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
      if (edge > 90) {
        edgeCount += 1;
        edgeCells.push({ x, y, edge });
      }
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
  const ocrHints = buildOcrHints(edgeCells, width, height, cellSize, textLikeDensity, contrast);
  const probableContent = inferContent(textLikeDensity, contrast, dominantRegions.length, ocrHints);

  return { brightness, contrast, textLikeDensity: Number(textLikeDensity.toFixed(3)), dominantRegions, probableContent, ocrHints };
}

function luminance(data: Uint8ClampedArray, idx: number): number {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
}

function buildOcrHints(
  edgeCells: EdgeCell[],
  width: number,
  height: number,
  cellSize: number,
  textLikeDensity: number,
  contrast: ScreenSemanticSummary["contrast"],
): ScreenOcrHints {
  const regions = clusterTextRegions(edgeCells, cellSize, width, height);
  const horizontalSpread = countDistinct(edgeCells.map((cell) => Math.round(cell.y / cellSize)));
  const verticalSpread = countDistinct(edgeCells.map((cell) => Math.round(cell.x / cellSize)));
  const textOrientation = edgeCells.length < 2
    ? "unknown"
    : horizontalSpread > verticalSpread * 1.4
      ? "horizontal"
      : verticalSpread > horizontalSpread * 1.4
        ? "vertical"
        : "mixed";

  return {
    likelyReadableText: contrast !== "low" && textLikeDensity > 0.04 && regions.length > 0,
    estimatedTextBlocks: regions.length,
    textOrientation,
    regions,
  };
}

function clusterTextRegions(edgeCells: EdgeCell[], cellSize: number, imageWidth: number, imageHeight: number): ScreenTextRegion[] {
  if (edgeCells.length === 0) return [];
  const sorted = [...edgeCells].sort((a, b) => a.y - b.y || a.x - b.x);
  const bands: EdgeCell[][] = [];

  for (const cell of sorted) {
    const band = bands.find((candidate) => Math.abs(candidate[0].y - cell.y) <= cellSize * 1.5);
    if (band) band.push(cell);
    else bands.push([cell]);
  }

  return bands
    .map((band) => {
      const minX = Math.max(0, Math.min(...band.map((cell) => cell.x)) - cellSize);
      const maxX = Math.min(imageWidth, Math.max(...band.map((cell) => cell.x)) + cellSize * 2);
      const minY = Math.max(0, Math.min(...band.map((cell) => cell.y)) - cellSize);
      const maxY = Math.min(imageHeight, Math.max(...band.map((cell) => cell.y)) + cellSize * 2);
      const areaCells = Math.max(1, Math.ceil((maxX - minX) / cellSize) * Math.ceil((maxY - minY) / cellSize));
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        density: Number(Math.min(1, band.length / areaCells).toFixed(3)),
      };
    })
    .filter((region) => region.width >= cellSize * 2 && region.height >= cellSize)
    .sort((a, b) => b.density * b.width * b.height - a.density * a.width * a.height)
    .slice(0, 8);
}

function countDistinct(values: number[]): number {
  return new Set(values).size;
}

function inferContent(
  textLikeDensity: number,
  contrast: ScreenSemanticSummary["contrast"],
  regionCount: number,
  ocrHints: ScreenOcrHints,
): ScreenSemanticSummary["probableContent"] {
  if (textLikeDensity < 0.025 && contrast === "low") return "blank_or_static";
  if (textLikeDensity > 0.22 && regionCount >= 3) return "code_or_table";
  if (ocrHints.likelyReadableText || textLikeDensity > 0.08) return "document";
  return "media";
}

export function formatScreenSemanticSummary(summary: ScreenSemanticSummary): string {
  return `screen:${summary.probableContent};brightness:${summary.brightness};contrast:${summary.contrast};textDensity:${summary.textLikeDensity};regions:${summary.dominantRegions.join("|") || "none"};ocr:${summary.ocrHints.likelyReadableText ? "likely" : "unlikely"};blocks:${summary.ocrHints.estimatedTextBlocks};orientation:${summary.ocrHints.textOrientation}`;
}
