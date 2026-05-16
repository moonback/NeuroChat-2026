import { describe, expect, it } from "vitest";
import { analyzeScreenSemantics, formatScreenSemanticSummary } from "../lib/screenSemanticLayer";

function makeImage(width: number, height: number, fill: (x: number, y: number) => number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const value = fill(x, y);
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("screen semantic layer", () => {
  it("classifies static low-contrast screens", () => {
    const summary = analyzeScreenSemantics(makeImage(64, 64, () => 32));
    expect(summary.probableContent).toBe("blank_or_static");
    expect(summary.brightness).toBe("dark");
    expect(summary.textLikeDensity).toBe(0);
  });

  it("produces a compact semantic signature for structured high-contrast content", () => {
    const summary = analyzeScreenSemantics(makeImage(128, 128, (x, y) => ((x + y) % 24 < 12 ? 20 : 235)));
    expect(summary.contrast).toBe("high");
    expect(summary.textLikeDensity).toBeGreaterThan(0);
    expect(formatScreenSemanticSummary(summary)).toContain(`screen:${summary.probableContent}`);
  });
});
