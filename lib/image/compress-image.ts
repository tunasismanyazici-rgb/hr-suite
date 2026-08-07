const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png"];

export type CompressImageResult = {
  file: File;
  originalSize: number;
  newSize: number;
  compressed: boolean;
};

export function isCompressibleImage(file: File): boolean {
  return COMPRESSIBLE_TYPES.includes(file.type);
}

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_DIMENSION
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function toJpegFileName(fileName: string): string {
  return fileName.replace(/\.[^./]+$/, "") + ".jpg";
}

export async function compressImage(file: File): Promise<CompressImageResult> {
  const originalSize = file.size;

  if (!isCompressibleImage(file)) {
    return { file, originalSize, newSize: originalSize, compressed: false };
  }

  try {
    // imageOrientation: "from-image" EXIF döndürme bilgisini piksellere uygular;
    // aksi halde canvas'a çizilen görsel ters/yan çıkabilir.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context alınamadı");

    // PNG saydamlığı JPEG'e girerken siyaha dönüşmesin diye beyaz zemin.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) throw new Error("canvas blob üretemedi");

    const compressedFile = new File([blob], toJpegFileName(file.name), {
      type: "image/jpeg",
    });

    return {
      file: compressedFile,
      originalSize,
      newSize: compressedFile.size,
      compressed: true,
    };
  } catch {
    return { file, originalSize, newSize: originalSize, compressed: false };
  }
}
