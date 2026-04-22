import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|bmp|tiff?)$/i;

export function isImagePath(filepath: string): boolean {
  return IMAGE_EXTS.test(path.extname(filepath));
}

const MIME_MAP: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function getMimeType(filepath: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const ext = path.extname(filepath).toLowerCase();
  return MIME_MAP[ext] ?? 'image/jpeg';
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY required');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Extract text from an image file using Claude vision.
 * Returns extracted text or null if the image contains no readable text or OCR fails.
 */
export async function extractImageText(filepath: string): Promise<string | null> {
  if (!isImagePath(filepath)) return null;

  let imageData: string;
  try {
    const buffer = fs.readFileSync(filepath);
    imageData = buffer.toString('base64');
  } catch {
    console.warn(`[imageOCR] Could not read file: ${filepath}`);
    return null;
  }

  const mediaType = getMimeType(filepath);

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData },
            },
            {
              type: 'text',
              text: 'Extract all readable text from this image. Return only the extracted text, preserving layout where possible. If there is no readable text, return the single word: NONE',
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim();

    if (!text || text === 'NONE') return null;
    return text;
  } catch (err) {
    console.warn(`[imageOCR] Claude vision failed for ${path.basename(filepath)}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
