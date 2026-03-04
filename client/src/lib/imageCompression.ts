const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;
const MAX_OUTPUT_BYTES = 1 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getScaledDimensions(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const ratio = Math.min(maxDim / width, maxDim / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality
    );
  });
}

export async function compressImageFile(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = getScaledDimensions(img.width, img.height, maxDimension);

    if (width === img.width && height === img.height && file.size <= MAX_OUTPUT_BYTES) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const isPng = file.type === "image/png";
    const outputType = isPng ? "image/png" : "image/jpeg";
    let currentQuality = quality;
    let blob = await canvasToBlob(canvas, outputType, isPng ? undefined : currentQuality);

    while (blob.size > MAX_OUTPUT_BYTES && currentQuality > 0.3 && !isPng) {
      currentQuality -= 0.1;
      blob = await canvasToBlob(canvas, outputType, currentQuality);
    }

    const ext = isPng ? ".png" : ".jpg";
    const compressedName = file.name.replace(/\.[^.]+$/, ext);
    return new File([blob], compressedName, { type: outputType });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressBase64Image(
  base64: string,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY
): Promise<string> {
  const img = await loadImage(base64);
  const { width, height } = getScaledDimensions(img.width, img.height, maxDimension);

  const originalSize = Math.round((base64.length * 3) / 4);
  if (width === img.width && height === img.height && originalSize <= MAX_OUTPUT_BYTES) {
    return base64;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  let currentQuality = quality;
  let result = canvas.toDataURL("image/jpeg", currentQuality);

  while (Math.round((result.length * 3) / 4) > MAX_OUTPUT_BYTES && currentQuality > 0.3) {
    currentQuality -= 0.1;
    result = canvas.toDataURL("image/jpeg", currentQuality);
  }

  return result;
}
