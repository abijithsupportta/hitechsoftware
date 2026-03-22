/**
 * Browser-side image compression utilities.
 * Extracted from BillingSection.tsx — keep UI components free of compression logic.
 */

const IMAGE_COMPRESSION_RATIO = 0.1; // target ~90% reduction, e.g. 1MB → ~100KB
const IMAGE_MIN_TARGET_BYTES = 80 * 1024;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'];

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
}

export function isLikelyVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return VIDEO_EXTENSIONS.includes(getFileExtension(file.name));
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.includes(getFileExtension(file.name));
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to read image for compression')); };
    image.src = objectUrl;
  });
}

async function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Failed to compress image')); return; }
      resolve(blob);
    }, 'image/webp', quality);
  });
}

/**
 * Compress an image File to approximately 10% of its original size (minimum 80KB).
 * Non-image files are returned as-is. Compressed files are returned as WebP.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!isLikelyImageFile(file)) return file;

  const targetBytes = Math.max(IMAGE_MIN_TARGET_BYTES, Math.floor(file.size * IMAGE_COMPRESSION_RATIO));
  const image = await loadImageElement(file);

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  let quality = 0.82;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image compression is not supported in this browser');

  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToWebpBlob(canvas, quality);
    bestBlob = blob;

    if (blob.size <= targetBytes) break;

    if (attempt % 2 === 0) {
      quality = Math.max(0.45, quality - 0.1);
    } else {
      width = Math.max(640, Math.round(width * 0.85));
      height = Math.max(480, Math.round(height * 0.85));
    }
  }

  if (!bestBlob || bestBlob.size >= file.size) return file;

  const compressedName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
  return new File([bestBlob], compressedName, { type: 'image/webp', lastModified: Date.now() });
}
