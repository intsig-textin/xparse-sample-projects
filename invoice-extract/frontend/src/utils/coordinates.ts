import type { BoundingRegion, HighlightRect, LlmPageDimension } from '../types/invoice';

/**
 * Convert bounding box pixel coordinates [x0,y0,x1,y1,x2,y2,x3,y3] to
 * percentage-based CSS values for overlay positioning.
 *
 * The coordinate system uses 8 values (4 corners, clockwise from top-left):
 *   [x0,y0] = top-left
 *   [x1,y1] = top-right
 *   [x2,y2] = bottom-right
 *   [x3,y3] = bottom-left
 */
export function positionToPercent(
  position: number[],
  pageWidth: number,
  pageHeight: number
): { left: number; top: number; width: number; height: number } | null {
  if (!position || position.length < 8 || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  const x0 = position[0];
  const y0 = position[1];
  const x1 = position[2];
  // y1 = position[3]  (top-right y, same as y0 for axis-aligned)
  // x2 = position[4]  (bottom-right x)
  const y2 = position[5];
  // x3 = position[6]  (bottom-left x)
  // y3 = position[7]  (bottom-left y)

  const left = (x0 / pageWidth) * 100;
  const top = (y0 / pageHeight) * 100;
  const width = ((x1 - x0) / pageWidth) * 100;
  const height = ((y2 - y0) / pageHeight) * 100;

  return { left, top, width, height };
}

/**
 * Extract highlight rectangles from bounding_regions for a given field.
 */
export function extractHighlightRects(
  boundingRegions: BoundingRegion[] | undefined | null,
  llmPages: LlmPageDimension[],
  fieldLabel?: string
): HighlightRect[] {
  if (!boundingRegions || boundingRegions.length === 0) return [];

  const rects: HighlightRect[] = [];

  for (const region of boundingRegions) {
    // backend returns page_id (1-based); page_index is a legacy field not used
    const pageIndex = region.page_index ?? ((region.page_id ?? 1) - 1);
    const position = region.position;

    if (!position || position.length < 8) continue;

    const pageDim = llmPages[pageIndex];
    if (!pageDim || pageDim.width <= 0 || pageDim.height <= 0) continue;

    const pct = positionToPercent(position, pageDim.width, pageDim.height);
    if (!pct) continue;

    rects.push({
      pageIndex,
      x: pct.left,
      y: pct.top,
      width: pct.width,
      height: pct.height,
      fieldLabel,
    });
  }

  return rects;
}

/**
 * Find the first page index from a list of bounding regions.
 */
export function getFirstPageIndex(boundingRegions: BoundingRegion[] | undefined | null): number {
  if (!boundingRegions || boundingRegions.length === 0) return 0;
  return boundingRegions[0].page_index ?? 0;
}

/**
 * Search raw_json recursively for bounding_regions matching a field path.
 * raw_json from the LLM response may have nested objects with bounding_regions.
 */
export function findBoundingRegionsInRawJson(
  rawJson: Record<string, unknown>,
  fieldPath: string[]
): BoundingRegion[] {
  let current: unknown = rawJson;

  for (const key of fieldPath) {
    if (current === null || typeof current !== 'object') return [];
    current = (current as Record<string, unknown>)[key];
  }

  if (current && typeof current === 'object' && !Array.isArray(current)) {
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.bounding_regions)) {
      return obj.bounding_regions as BoundingRegion[];
    }
  }

  return [];
}
