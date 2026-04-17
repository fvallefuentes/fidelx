import sharp from "sharp";

/**
 * Process a merchant logo: trim whitespace borders, then fit into 160x50 max
 * (Apple Wallet logo dimension). Preserves transparency.
 */
export async function processLogo(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .trim()
    .resize(160, 50, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * Derive a 29x29 square icon from an uploaded image (typically the logo).
 * Used for Apple Wallet notifications.
 */
export async function processIcon(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .trim()
    .resize(29, 29, { fit: "cover" })
    .png()
    .toBuffer();
}

/**
 * Process a strip/banner image to 375x98 (Apple Wallet strip without square barcode).
 * Uses cover fit so image fills the banner without letterboxing.
 */
export async function processStrip(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(375, 98, { fit: "cover" })
    .png()
    .toBuffer();
}

/**
 * Resize a logo without trimming (used when the merchant manually cropped
 * via the UI — trust their chosen framing).
 */
export async function processLogoNoTrim(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(160, 50, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * Validate that a buffer is a supported image format (png/jpeg/webp).
 * Uses sharp's metadata inspection (reads magic bytes, not just header strings).
 */
export async function validateImageBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    return ["png", "jpeg", "webp"].includes(meta.format ?? "");
  } catch {
    return false;
  }
}
