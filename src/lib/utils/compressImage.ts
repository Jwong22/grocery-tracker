"use client";

/**
 * Resize an image file to a max dimension while maintaining aspect ratio.
 * Returns a compressed JPEG blob that's much faster to upload/base64-encode.
 * Falls back to the original file if canvas operations fail.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8,
): Promise<File> {
  // Skip non-image files or very small files
  if (!file.type.startsWith("image/") || file.size < 100_000) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than maxDimension
      if (width <= maxDimension && height <= maxDimension) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      // Calculate new dimensions
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
  });
}
