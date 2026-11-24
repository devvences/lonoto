export interface CompressedImage {
  src: string;
  alt: string;
  bytes: number;
}

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be decoded.'));
    };
    img.src = url;
  });
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || 'Image';
}

/**
 * SVGs without width/height but with a viewBox have no intrinsic size in some
 * browsers; an <img> using one can collapse to 0×0 inside a shrink-to-fit
 * container. Derive explicit dimensions from the viewBox (or the SVG default
 * size) so the image always has a layout size.
 */
function normalizeSvg(text: string): string {
  const opening = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!opening) return text;
  const hasWidth = /\swidth\s*=/i.test(opening);
  const hasHeight = /\sheight\s*=/i.test(opening);
  if (hasWidth && hasHeight) return text;

  const viewBox = opening.match(/\sviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  let width = 300;
  let height = 150;
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      width = parts[2];
      height = parts[3];
    }
  }

  const attributes = [
    hasWidth ? '' : `width="${width}"`,
    hasHeight ? '' : `height="${height}"`,
  ]
    .filter(Boolean)
    .join(' ');
  return text.replace(/<svg\b/i, `<svg ${attributes}`);
}

/**
 * Downscale + compress an image and return a data URL. Keeping images inline
 * means a note is fully self-contained (and survives an export/import).
 */
export async function prepareImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be inserted.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is larger than 25 MB.');
  }

  const alt = baseName(file.name);

  // SVGs are already tiny and vector: keep them untouched apart from making
  // sure they have an intrinsic size.
  if (file.type === 'image/svg+xml') {
    const text = normalizeSvg(await file.text());
    const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    return { src, alt, bytes: src.length };
  }

  const original = await readAsDataUrl(file);
  const bitmap = await loadBitmap(file);
  const width = 'width' in bitmap ? bitmap.width : 0;
  const height = 'height' in bitmap ? bitmap.height : 0;

  if (!width || !height) {
    return { src: original, alt, bytes: original.length };
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { src: original, alt, bytes: original.length };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  if ('close' in bitmap && typeof bitmap.close === 'function') {
    bitmap.close();
  }

  let src = canvas.toDataURL('image/webp', QUALITY);
  if (!src.startsWith('data:image/webp')) {
    src = canvas.toDataURL('image/jpeg', QUALITY);
  }

  // An already-optimized small file can beat a re-encode.
  if (original.length < src.length) {
    return { src: original, alt, bytes: original.length };
  }

  return { src, alt, bytes: src.length };
}
