import { expect, type Locator } from "@playwright/test";

export interface ContrastReading {
  sample: string;
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
}

export async function measureContrast(
  locator: Locator,
  sample: string,
  minimum: number,
  property = "color",
  against: "inside" | "outside" = "inside",
): Promise<ContrastReading> {
  await expect(locator).toBeVisible();
  const colors = await locator.evaluate((element, { property, against }) => {
    const foreground = getComputedStyle(element).getPropertyValue(property);
    let background = "rgba(0, 0, 0, 0)";
    for (let node: Element | null = against === "inside" ? element : element.parentElement; node; node = node.parentElement) {
      background = getComputedStyle(node).backgroundColor;
      if (background.startsWith("rgb(")) break;
    }
    return { foreground, background };
  }, { property, against });
  const ratio = contrastRatio(colors.foreground, colors.background);
  expect(ratio, `${sample}: ${colors.foreground} against ${colors.background}`).toBeGreaterThanOrEqual(minimum);
  return { sample, ...colors, ratio, minimum };
}

export function contrastRatio(foreground: string, background: string) {
  function luminance(color: string) {
    const rgb = color.match(/^rgb\((\d+), (\d+), (\d+)\)$/)?.slice(1);
    if (!rgb) throw new Error(`Expected a solid browser RGB color, received ${color}`);
    const [r, g, b] = rgb.map((part) => {
      const channel = Number(part) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
